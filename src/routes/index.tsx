import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import FloodMap, { type ViewportBounds } from "@/components/flood/FloodMap";
import ProductionHeader from "@/components/flood/ProductionHeader";
import ProductionBottomSheet from "@/components/flood/ProductionBottomSheet";
import BottomNav from "@/components/flood/BottomNav";
import ThreeTapReportModal from "@/components/flood/ThreeTapReportModal";
import AuthModal from "@/components/flood/AuthModal";
import EmergencyHelpModal from "@/components/flood/EmergencyHelpModal";
import ControlRoomModal from "@/components/flood/ControlRoomModal";
import AlertsDrawer from "@/components/flood/AlertsDrawer";
import MapLayerControls from "@/components/flood/MapLayerControls";
import MapLegend from "@/components/flood/MapLegend";
import type { MapLayerOptions } from "@/lib/flood/types";
import {
  fetchRealWeather,
  fetchOsmShelters,
  getCurrentUserGps,
  calculateWorldwideSafeRoute,
  type RealWeatherResult,
} from "@/lib/flood/openData";
import { generateViewportTiles, tileIdFromLatLng } from "@/lib/flood/dynamicGrid";
import {
  fetchLiveReports,
  fetchLiveIncidents,
  fetchLiveAlerts,
  getCurrentUser,
  getUserProfile,
  isSupabaseConfigured,
  getSupabase,
  getQueuedOfflineReports,
  clearQueuedReport,
  submitLiveReport,
  type UserProfile,
} from "@/lib/supabase/client";
import { useAppState, getState, setState } from "@/lib/flood/store";
import { MAP_CENTER, SHELTERS as INITIAL_SHELTERS } from "@/lib/flood/data";
import { NavigationHUD } from "@/components/routing/NavigationHUD";
import ShelterDetailsModal from "@/components/flood/ShelterDetailsModal";
import CivicAiAssistant from "@/components/flood/CivicAiAssistant";
import HackathonShowcaseModal from "@/components/flood/HackathonShowcaseModal";
import ImpactDashboardModal from "@/components/flood/ImpactDashboardModal";
import { recordImpactEvent } from "@/lib/flood/impactTracker";
import type { AgentAction } from "@/lib/ai/bengaluruAgent";
import NearbySheltersDrawer from "@/components/flood/NearbySheltersDrawer";
import { reverseGeocode } from "@/lib/reporting/reverseGeocoder";
import { findNearestKnownShelters, getHaversineDistanceKm, formatDistanceString } from "@/lib/flood/sheltersDatabase";
import { listenForOfflineFlush, registerStreetFloodServiceWorker } from "@/lib/offline/serviceWorkerRegistration";
import type { EvacuationMode, FloodAlert, FloodReport, RoadIncident, Shelter, Tile } from "@/lib/flood/types";
import { toast } from "sonner";
import { getCurrentTideStatus } from "@/lib/flood/tideData";

export const MUMBAI_CORRIDOR_CENTER: [number, number] = [19.0508, 72.8714];
export const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];

export const INITIAL_MUMBAI_WEATHER: RealWeatherResult = {
  recentRainMm: 86,
  rainRateMmPerHour: 24,
  forecastRain3hMm: 117,
  hourlyTimes: ["14:00", "15:00", "16:00", "17:00", "18:00"],
  hourlyRainMm: [18, 24, 32, 28, 15],
  temperatureC: 28.5,
  weatherCode: 65,
};

export const INITIAL_BENGALURU_WEATHER: RealWeatherResult = {
  recentRainMm: 24,
  rainRateMmPerHour: 12,
  forecastRain3hMm: 45,
  hourlyTimes: ["14:00", "15:00", "16:00", "17:00", "18:00"],
  hourlyRainMm: [5, 12, 18, 10, 0],
  temperatureC: 24.5,
  weatherCode: 61,
};

function getInitialCivicLocation(): { pos: [number, number]; zoom: number; cityName: string } {
  if (typeof window !== "undefined") {
    try {
      const savedCity = localStorage.getItem("sf_active_city");
      const savedPos = localStorage.getItem("sf_user_pos");
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (Array.isArray(parsed) && parsed.length === 2 && !isNaN(parsed[0]) && !isNaN(parsed[1])) {
          return {
            pos: [parsed[0], parsed[1]],
            zoom: 14,
            cityName: savedCity || "Mumbai (Sion-Kurla Corridor)",
          };
        }
      }
      if (savedCity) {
        if (savedCity.toLowerCase().includes("bengaluru")) {
          return {
            pos: BENGALURU_CENTER,
            zoom: 13,
            cityName: "Bengaluru (Tech Corridors)",
          };
        }
        return {
          pos: MUMBAI_CORRIDOR_CENTER,
          zoom: 14,
          cityName: savedCity,
        };
      }
    } catch {
      // Ignore storage errors
    }
  }
  // Default to flagship Bengaluru Tech Corridors (IBM Bobathon Build for Bengaluru)
  return {
    pos: BENGALURU_CENTER,
    zoom: 13,
    cityName: "Bengaluru (Tech Corridors)",
  };
}

export const Route = createFileRoute("/")({
  component: StreetFloodApp,
});

export default function StreetFloodApp() {
  const localState = useAppState() || getState();
  const initialLoc = useMemo(() => getInitialCivicLocation(), []);

  // User and Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isEvaluationMode, setIsEvaluationMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sf_evaluation_mode") === "true";
    }
    return false;
  });

  const handleToggleEvaluationMode = (enabled: boolean) => {
    setIsEvaluationMode(enabled);
    if (typeof window !== "undefined") {
      if (enabled) {
        localStorage.setItem("sf_evaluation_mode", "true");
      } else {
        localStorage.removeItem("sf_evaluation_mode");
      }
    }
  };

  // User GPS & Center
  const [userPos, setUserPos] = useState<[number, number]>(initialLoc.pos);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    key: number;
  } | null>({
    lat: initialLoc.pos[0],
    lng: initialLoc.pos[1],
    zoom: initialLoc.zoom,
    key: 1,
  });

  // Active Viewport Bounding Box
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds>({
    south: initialLoc.pos[0] - 0.05,
    north: initialLoc.pos[0] + 0.05,
    west: initialLoc.pos[1] - 0.05,
    east: initialLoc.pos[1] + 0.05,
    centerLat: initialLoc.pos[0],
    centerLng: initialLoc.pos[1],
    zoom: initialLoc.zoom,
  });

  // Real Data: Weather, Shelters, Reports, Incidents, Alerts
  const [weather, setWeather] = useState<RealWeatherResult | null>(
    initialLoc.cityName.toLowerCase().includes("bengaluru")
      ? INITIAL_BENGALURU_WEATHER
      : INITIAL_MUMBAI_WEATHER,
  );
  const [shelters, setShelters] = useState<Shelter[]>(INITIAL_SHELTERS);
  const [liveReports, setLiveReports] = useState<FloodReport[]>(localState.reports);
  const [liveIncidents, setLiveIncidents] = useState<RoadIncident[]>(localState.incidents);
  const [liveAlerts, setLiveAlerts] = useState<FloodAlert[]>(localState.alerts);
  const [offlineQueuedCount, setOfflineQueuedCount] = useState(0);
  const [activeCityName, setActiveCityName] = useState<string>(initialLoc.cityName);
  const [selectedShelterModal, setSelectedShelterModal] = useState<Shelter | null>(null);
  const [shelterDrawerOpen, setShelterDrawerOpen] = useState(false);
  const [highlightShelterId, setHighlightShelterId] = useState<string | null>(null);

  // Map Layer Visibility Controls
  const [layerOptions, setLayerOptions] = useState<MapLayerOptions>({
    showTechnicalGrid: false,
    showAffectedRoads: true,
    showShelters: true,
    showClosures: true,
    showReports: true,
    showEvacuationRoute: true,
    highContrast: false,
  });

// Selection & Navigation
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "report" | "alerts" | "help">("map");
  const [roadRoute, setRoadRoute] = useState<Awaited<ReturnType<typeof calculateWorldwideSafeRoute>> | null>(null);
  const [evacuationMode, setEvacuationMode] = useState<EvacuationMode>("car");

  // Modals & Drawers
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [controlRoomOpen, setControlRoomOpen] = useState(false);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [civicAssistantOpen, setCivicAssistantOpen] = useState(false);
  const [hackathonShowcaseOpen, setHackathonShowcaseOpen] = useState(false);
  const [impactDashboardOpen, setImpactDashboardOpen] = useState(false);

  // 1. Initial User Geolocation
  useEffect(() => {
    registerStreetFloodServiceWorker(import.meta.env.BASE_URL).catch(() => undefined);
    const stopOfflineListener = listenForOfflineFlush(() => window.dispatchEvent(new Event("online")));
    setIsLocating(true);
    getCurrentUserGps()
      .then((res) => {
        // Record GPS position for blue user marker and accurate local distance calculations
        setUserPos([res.lat, res.lng]);
        // Note: We intentionally do NOT call setFocus or setActiveCityName on initial mount!
        // Keeps primary view anchored on flagship corridor while preserving full manual pan/zoom control.
      })
      .catch((err) => {
        console.warn("GPS init info:", err.message);
      })
      .finally(() => {
        setIsLocating(false);
      });
    return stopOfflineListener;
  }, []);

  // 2. Fetch User Profile & Auth
  const refreshAuth = useCallback(async () => {
    try {
      const u = await getCurrentUser();
      if (u) {
        const prof = await getUserProfile(u.id);
        setCurrentUser(prof);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // 3. Sync Offline Queued Reports
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const queued = await getQueuedOfflineReports();
      setOfflineQueuedCount(queued.length);
      if (queued.length === 0) return;

      for (const rep of queued) {
        try {
          await submitLiveReport({
            lat: rep.lat,
            lng: rep.lng,
            waterDepth: rep.waterDepth,
            description: rep.description,
            ...(rep.photoUrl ? { photoDataUrl: rep.photoUrl } : {}),
          });
          await clearQueuedReport(rep.id);
        } catch {
          // Will retry next interval
        }
      }
      toast.success("Synchronized offline flood reports with server.");
      setOfflineQueuedCount((await getQueuedOfflineReports()).length);
    };

    syncOfflineQueue();
    window.addEventListener("online", syncOfflineQueue);
    return () => window.removeEventListener("online", syncOfflineQueue);
  }, []);

  // 4. Load Live Reports, Incidents, Alerts from Supabase / Local
  const loadData = useCallback(async () => {
    if (isSupabaseConfigured()) {
      try {
        const [reps, incs, alts] = await Promise.all([
          fetchLiveReports(),
          fetchLiveIncidents(),
          fetchLiveAlerts(),
        ]);
        if (reps.length > 0) setLiveReports(reps);
        if (incs.length > 0) setLiveIncidents(incs);
        if (alts.length > 0) setLiveAlerts(alts);
      } catch (err) {
        console.warn("Cloud data fetch fallback:", err);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 5. Fetch Open-Meteo Weather & OSM Shelters for Active Viewport
  const lastFetchedCenter = useRef<[number, number]>([0, 0]);
  useEffect(() => {
    const cLat = viewportBounds.centerLat;
    const cLng = viewportBounds.centerLng;
    const dist = Math.hypot(cLat - lastFetchedCenter.current[0], cLng - lastFetchedCenter.current[1]);

    // Only re-fetch if moved > ~2km
    if (dist < 0.02 && weather !== null) return;
    lastFetchedCenter.current = [cLat, cLng];

    fetchRealWeather(cLat, cLng).then((w) => setWeather(w));

    fetchOsmShelters(viewportBounds).then((osmShelters) => {
      if (osmShelters.length > 0) {
        setShelters((prev) => {
          const ids = new Set(osmShelters.map((s) => s.id));
          return [...osmShelters, ...prev.filter((p) => !ids.has(p.id))];
        });
      }
    });
  }, [viewportBounds, weather]);



  // 6. Dynamic Grid Tile Generation (Worldwide)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const activeAlerts = useMemo(
    () =>
      liveAlerts.filter(
        (alert) =>
          alert.status === "Published" &&
          now - new Date(alert.createdAt).getTime() <= 6 * 60 * 60 * 1000,
      ),
    [liveAlerts, now],
  );

  const dynamicTiles = useMemo(() => {
    return generateViewportTiles(
      viewportBounds,
      liveReports,
      liveIncidents,
      weather?.recentRainMm || 0,
      weather?.forecastRain3hMm || 0,
      now,
    );
  }, [viewportBounds, liveReports, liveIncidents, weather, now]);

  useEffect(() => {
    if (!weather) return;
    const tide = getCurrentTideStatus(new Date(), weather.rainRateMmPerHour);
    const critical = weather.rainRateMmPerHour > 25 || (tide.heightMeters > 4.2 && weather.rainRateMmPerHour > 15);
    const id = "live-monsoon-tidal-warning";
    setLiveAlerts((previous) => {
      const withoutLive = previous.filter((alert) => alert.id !== id);
      if (!critical) return withoutLive;
      return [{
        id,
        title: "Critical Monsoon & Tidal Waterlogging Warning",
        message: `Heavy rainfall of ${weather.rainRateMmPerHour.toFixed(1)} mm/h with a ${tide.heightMeters.toFixed(2)}m tide may reduce drainage capacity. Avoid low-lying corridors near Central Silk Board, Bellandur ORR, and Koramangala and use designated relief centres.`,
        severity: "Critical",
        type: "Municipal",
        status: "Published",
        tileIds: dynamicTiles.filter((tile) => tile.ward.includes("BBMP") || tile.currentRiskLevel === "Critical" || tile.currentRiskLevel === "High").map((tile) => tile.id),
        wardLabel: "BBMP Central & East Zones",
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      }, ...withoutLive];
    });
  }, [weather, dynamicTiles]);

  // Selected tile object
  const currentTile = useMemo(() => {
    if (selectedTileId) {
      const match = dynamicTiles.find((t) => t.id === selectedTileId);
      if (match) return match;
    }
    // Default to user's snapped cell
    const userCellId = tileIdFromLatLng(userPos[0], userPos[1]);
    return dynamicTiles.find((t) => t.id === userCellId) || dynamicTiles[0] || null;
  }, [selectedTileId, dynamicTiles, userPos]);

  // Contextual Reference Coordinate:
  // When zoomed out to regional/national overview (< 11), anchor to Bengaluru civic center.
  // When zoomed in, if user is within 15km of map center, prioritize user's GPS; otherwise use viewport center.
  const referenceCoord = useMemo<[number, number]>(() => {
    const cLat = viewportBounds.centerLat;
    const cLng = viewportBounds.centerLng;
    if (viewportBounds.zoom < 11) {
      return BENGALURU_CENTER;
    }
    const distToGps = getHaversineDistanceKm(userPos[0], userPos[1], cLat, cLng);
    if (distToGps < 15) {
      return userPos;
    }
    return [cLat, cLng];
  }, [userPos, viewportBounds]);

  // Nearest Shelter Calculation using Haversine Geodesic Distance
  const nearestShelter = useMemo(() => {
    const [refLat, refLng] = referenceCoord;
    const dbCandidates = findNearestKnownShelters(refLat, refLng, 6);
    const osmCandidates = shelters.filter((s) => s.id.startsWith("osm_sh_"));
    const pool = [...osmCandidates, ...dbCandidates];
    if (pool.length === 0) return null;

    let minD = Infinity;
    let best: (Shelter & { distanceKm?: number; distanceLabel?: string }) | null = null;
    for (const s of pool) {
      const d = getHaversineDistanceKm(refLat, refLng, s.lat, s.lng);
      if (d < minD) {
        minD = d;
        best = {
          ...s,
          distanceKm: d,
          distanceLabel: formatDistanceString(d),
        };
      }
    }
    return best;
  }, [referenceCoord, shelters]);

  // Handlers
  const handleLocateUser = async () => {
    setIsLocating(true);
    try {
      const res = await getCurrentUserGps();
      setUserPos([res.lat, res.lng]);
      setFocus({ lat: res.lat, lng: res.lng, zoom: 16, key: Date.now() });
      try {
        const geo = await reverseGeocode(res.lat, res.lng);
        const city = geo.city || geo.ward || geo.neighbourhood || geo.displayName.split(",")[0];
        if (city) {
          const clean = city.trim();
          setActiveCityName(clean);
          try {
            localStorage.setItem("sf_active_city", clean);
            localStorage.setItem("sf_user_pos", JSON.stringify([res.lat, res.lng]));
          } catch (storageErr) {
            console.warn("Could not persist active city in storage:", storageErr);
          }
        }
      } catch {
        // Fallback
      }
      toast.success("Location updated from GPS.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not acquire location.";
      toast.error(msg);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectPlace = (lat: number, lng: number, name: string) => {
    setFocus({ lat, lng, zoom: 15, key: Date.now() });
    setViewportBounds((prev) => ({
      ...prev,
      centerLat: lat,
      centerLng: lng,
      south: lat - 0.03,
      north: lat + 0.03,
      west: lng - 0.03,
      east: lng + 0.03,
    }));
    const cleanCity = name.split(",")[0]?.trim();
    if (cleanCity) {
      setActiveCityName(cleanCity);
      try {
        localStorage.setItem("sf_active_city", cleanCity);
        localStorage.setItem("sf_user_pos", JSON.stringify([lat, lng]));
      } catch (storageErr) {
        console.warn("Could not persist active city in storage:", storageErr);
      }
    }
    toast.info(`Viewing ${name}`);
  };

  const handlePlanRouteToShelter = async (shelter: Shelter) => {
    setHighlightShelterId(shelter.id);
    recordImpactEvent("shelter_viewed");
    toast.loading("Calculating safest road route avoiding flood areas...", { id: "routing" });
    const blocked = liveIncidents
      .filter((i): i is RoadIncident & { lat: number; lng: number } => typeof i.lat === "number" && typeof i.lng === "number")
      .map((i) => ({
        lat: i.lat,
        lng: i.lng,
        description: i.description,
      }));

    const result = await calculateWorldwideSafeRoute(referenceCoord, [shelter.lat, shelter.lng], blocked, evacuationMode);
    toast.dismiss("routing");
    if (result) {
      recordImpactEvent("route_calculated");
      setRoadRoute(result);
      toast.success(`Safe evacuation route calculated: ${result.distanceKm} km (~ ${result.durationMinutes} min)`);
    } else {
      toast.error("Could not find a road route to this shelter.");
    }
  };

  const handleExecuteAgentAction = useCallback(
    (action: AgentAction) => {
      if (action.type === "pan" && action.lat != null && action.lng != null) {
        setUserPos([action.lat, action.lng]);
        setFocus({ lat: action.lat, lng: action.lng, zoom: action.zoom || 15, key: Date.now() });
      } else if (action.type === "navigate" && action.lat != null && action.lng != null) {
        const dest: [number, number] = [action.lat, action.lng];
        const blocked = liveIncidents
          .filter((i): i is RoadIncident & { lat: number; lng: number } => typeof i.lat === "number" && typeof i.lng === "number")
          .map((i) => ({
            lat: i.lat,
            lng: i.lng,
            description: i.description,
          }));
        calculateWorldwideSafeRoute(referenceCoord, dest, blocked, evacuationMode).then((res) => {
          if (res) {
            setRoadRoute(res);
            toast.success("Calculated safe road route");
          }
        });
      } else if (action.type === "call" && action.phone) {
        window.location.href = `tel:${action.phone}`;
      }
    },
    [referenceCoord, liveIncidents, evacuationMode],
  );

  const handleRemoveIncident = (id: string) => {
    setLiveIncidents((prev) => prev.filter((i) => i.id !== id));
    setState((s) => ({ ...s, incidents: s.incidents.filter((i) => i.id !== id) }));
    toast.success("Road closure removed. Route reopened to traffic.");
  };

  const handleReportCreated = (newReport: FloodReport) => {
    setLiveReports((prev) => [newReport, ...prev]);
    setState((s) => ({ ...s, reports: [newReport, ...s.reports] }));
  };

  const handleVerifyReport = (id: string) => {
    setLiveReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Verified" as const } : r)),
    );
    setState((s) => ({
      ...s,
      reports: s.reports.map((r) => (r.id === id ? { ...r, status: "Verified" as const } : r)),
    }));
  };

  const handleDismissReport = (id: string) => {
    setLiveReports((prev) => prev.filter((r) => r.id !== id));
    setState((s) => ({
      ...s,
      reports: s.reports.filter((r) => r.id !== id),
    }));
  };

  const handleAddIncident = (newInc: RoadIncident) => {
    setLiveIncidents((prev) => [newInc, ...prev]);
    setState((s) => ({ ...s, incidents: [newInc, ...s.incidents] }));
  };

  const handleAddAlert = (newAlert: FloodAlert) => {
    setLiveAlerts((prev) => [newAlert, ...prev]);
    setState((s) => ({ ...s, alerts: [newAlert, ...s.alerts] }));
  };

  const canAccessControlRoom =
    currentUser?.role === "authority" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "moderator" ||
    isEvaluationMode;

  return (
    <div
      data-high-contrast={layerOptions.highContrast ? "true" : "false"}
      className={`relative w-full h-[100dvh] overflow-hidden flex flex-col select-none font-sans ${layerOptions.highContrast ? "bg-[#0a0a0a] text-white" : "bg-background"}`}
    >
      {/* 1. TOP HEADER (SEARCH + GPS + PROFILE) */}
      <ProductionHeader
        onSelectPlace={handleSelectPlace}
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenControlRoom={() => setControlRoomOpen(true)}
        canAccessControlRoom={canAccessControlRoom}
        isEvaluationMode={isEvaluationMode}
        onOpenAlerts={() => setAlertsDrawerOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
        alertCount={activeAlerts.length}
        criticalAlert={activeAlerts.find((alert) => alert.severity === "Critical")?.message}
        reports={liveReports}
        offlineQueuedCount={offlineQueuedCount}
        activeCityName={activeCityName}
        onOpenCivicAssistant={() => setCivicAssistantOpen(true)}
        onOpenHackathonShowcase={() => setHackathonShowcaseOpen(true)}
        onOpenImpactDashboard={() => setImpactDashboardOpen(true)}
      />

      {/* 2. FULLSCREEN MAP */}
      <div className="absolute inset-0 z-0">
        <FloodMap
          tiles={dynamicTiles}
          reports={liveReports}
          incidents={liveIncidents}
          shelters={shelters}
          alertTileIds={new Set()}
          userPos={userPos}
          focus={focus}
          selectedTileId={selectedTileId}
          highlightShelterId={highlightShelterId}
          roadRouteCoords={roadRoute?.coordinates ?? null}
          roadRouteSafety={roadRoute?.safetyStatus}
          showPredicted={true}
          layerOptions={layerOptions}
          onTileClick={(tid, lat, lng) => {
            setSelectedTileId(tid);
          }}
          onShelterClick={(shId) => {
            const sh = shelters.find((s) => s.id === shId);
            if (sh) {
              setHighlightShelterId(sh.id);
              setSelectedShelterModal(sh);
            }
          }}
          onBoundsChange={(b) => setViewportBounds(b)}
        />
      </div>

      {/* MAP LAYER CONTROLS (TOP-RIGHT) */}
      <MapLayerControls
        options={layerOptions}
        onChange={setLayerOptions}
        isAdmin={canAccessControlRoom}
      />

            {/* FLOATING NAVIGATION HUD FOR ACTIVE ROUTE */}
      {roadRoute && (
        <aside aria-label="Active route guidance" className="absolute top-20 right-4 z-30 max-w-sm w-full hidden md:block">
          <NavigationHUD route={roadRoute} language="en-IN" />
        </aside>
      )}

      {/* FLOOD RISK LEGEND (BOTTOM-RIGHT) */}
      <MapLegend />

      {/* 3. PERSISTENT 3-SNAP BOTTOM SHEET (PEEK / HALF / FULL) */}
      <ProductionBottomSheet
        currentTile={currentTile}
        weather={weather}
        nearestShelter={nearestShelter}
        roadRoute={roadRoute}
        onPlanRouteToShelter={handlePlanRouteToShelter}
        onOpenReportModal={() => setReportModalOpen(true)}
        onClearRoute={() => {
          setRoadRoute(null);
          setHighlightShelterId(null);
        }}
        onOpenAlerts={() => setAlertsDrawerOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
        alertCount={activeAlerts.length}
        evacuationMode={evacuationMode}
        onEvacuationModeChange={(mode) => {
          setEvacuationMode(mode);
          if (nearestShelter) void handlePlanRouteToShelter(nearestShelter);
        }}
        onOpenShelterDetails={(sh) => setSelectedShelterModal(sh)}
        onOpenAllShelters={() => setShelterDrawerOpen(true)}
        sheltersCount={shelters.length}
        activeCityName={activeCityName}
        isNationalView={viewportBounds.zoom < 11}
        onSelectCity={(city, lat, lng) => handleSelectPlace(lat, lng, city)}
        onOpenCivicAssistant={() => setCivicAssistantOpen(true)}
        onOpenHackathonShowcase={() => setHackathonShowcaseOpen(true)}
        onOpenImpactDashboard={() => setImpactDashboardOpen(true)}
      />

      {/* 4. BOTTOM 4-TAB NAVIGATION DOCK */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "map") {
            setRoadRoute(null);
          }
        }}
        alertCount={activeAlerts.length}
        onOpenReport={() => setReportModalOpen(true)}
        onOpenAlerts={() => setAlertsDrawerOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      {/* 5. MODALS & DRAWERS */}
      <ThreeTapReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        userCoords={userPos}
        existingReports={liveReports}
        weather={weather}
        onReportCreated={handleReportCreated}
      />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={refreshAuth}
        isEvaluationMode={isEvaluationMode}
        onToggleEvaluationMode={handleToggleEvaluationMode}
      />

      <EmergencyHelpModal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      <ControlRoomModal
        open={controlRoomOpen}
        onClose={() => setControlRoomOpen(false)}
        currentUser={currentUser}
        reports={liveReports}
        incidents={liveIncidents}
        alerts={activeAlerts}
        mapCenter={[viewportBounds.centerLat, viewportBounds.centerLng]}
        weather={weather}
        shelters={shelters}
        onVerifyReport={handleVerifyReport}
        onDismissReport={handleDismissReport}
        onAddIncident={handleAddIncident}
        onRemoveIncident={handleRemoveIncident}
        onAddAlert={handleAddAlert}
      />

      <HackathonShowcaseModal
        open={hackathonShowcaseOpen}
        onClose={() => setHackathonShowcaseOpen(false)}
        onJumpToCorridor={handleSelectPlace}
        onOpenReportModal={() => setReportModalOpen(true)}
        onOpenControlRoom={() => setControlRoomOpen(true)}
        onOpenCivicAssistant={() => setCivicAssistantOpen(true)}
        onOpenImpactDashboard={() => setImpactDashboardOpen(true)}
      />

      <ImpactDashboardModal
        open={impactDashboardOpen}
        onClose={() => setImpactDashboardOpen(false)}
        reports={liveReports}
        incidents={liveIncidents}
        shelters={shelters}
      />

      <ShelterDetailsModal
        shelter={selectedShelterModal}
        open={!!selectedShelterModal}
        onClose={() => setSelectedShelterModal(null)}
        onPlanRoute={handlePlanRouteToShelter}
        userCoords={userPos}
      />

      <NearbySheltersDrawer
        open={shelterDrawerOpen}
        onClose={() => setShelterDrawerOpen(false)}
        shelters={shelters}
        referenceCoord={referenceCoord}
        onSelectShelter={(sh) => setSelectedShelterModal(sh)}
        onPlanRoute={handlePlanRouteToShelter}
      />

      <AlertsDrawer
        open={alertsDrawerOpen}
        alerts={liveAlerts}
        tiles={dynamicTiles}
        viewportTileIds={new Set(dynamicTiles.map((t) => t.id))}
        onClose={() => setAlertsDrawerOpen(false)}
        onSelectAlertTiles={(tids) => {
          if (tids.length > 0 && tids[0]) setSelectedTileId(tids[0]);
        }}
        onOpenPreparedness={() => {
          setAlertsDrawerOpen(false);
          setHelpModalOpen(true);
        }}
      />

      <CivicAiAssistant
        open={civicAssistantOpen}
        onOpenChange={setCivicAssistantOpen}
        userPos={userPos}
        weather={weather}
        reports={liveReports}
        incidents={liveIncidents}
        shelters={shelters}
        onExecuteAction={handleExecuteAgentAction}
        activeCityName={activeCityName}
      />
    </div>
  );
}
