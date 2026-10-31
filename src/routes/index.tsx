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
import { findNearestKnownShelters, getHaversineDistanceKm, formatDistanceString } from "@/lib/flood/sheltersDatabase";
import type { FloodAlert, FloodReport, RoadIncident, Shelter, Tile } from "@/lib/flood/types";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: StreetFloodApp,
});

export default function StreetFloodApp() {
  const localState = useAppState() || getState();

  // User and Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // User GPS & Center
  const [userPos, setUserPos] = useState<[number, number]>(MAP_CENTER);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    key: number;
  } | null>(null);

  // Active Viewport Bounding Box
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds>({
    south: MAP_CENTER[0] - 0.02,
    north: MAP_CENTER[0] + 0.02,
    west: MAP_CENTER[1] - 0.02,
    east: MAP_CENTER[1] + 0.02,
    centerLat: MAP_CENTER[0],
    centerLng: MAP_CENTER[1],
  });

  // Real Data: Weather, Shelters, Reports, Incidents, Alerts
  const [weather, setWeather] = useState<RealWeatherResult | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>(INITIAL_SHELTERS);
  const [liveReports, setLiveReports] = useState<FloodReport[]>(localState.reports);
  const [liveIncidents, setLiveIncidents] = useState<RoadIncident[]>(localState.incidents);
  const [liveAlerts, setLiveAlerts] = useState<FloodAlert[]>(localState.alerts);

  // Selection & Navigation
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "report" | "alerts" | "help">("map");
  const [roadRoute, setRoadRoute] = useState<Awaited<ReturnType<typeof calculateWorldwideSafeRoute>> | null>(null);

  // Modals & Drawers
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [controlRoomOpen, setControlRoomOpen] = useState(false);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);

  // 1. Initial User Geolocation
  useEffect(() => {
    setIsLocating(true);
    getCurrentUserGps()
      .then((res) => {
        setUserPos([res.lat, res.lng]);
        setFocus({ lat: res.lat, lng: res.lng, zoom: 15, key: Date.now() });
      })
      .catch((err) => {
        console.warn("GPS init info:", err.message);
      })
      .finally(() => {
        setIsLocating(false);
      });
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
      if (queued.length === 0) return;

      for (const rep of queued) {
        try {
          await submitLiveReport({
            lat: rep.lat,
            lng: rep.lng,
            waterDepth: rep.waterDepth,
            description: rep.description,
            photoDataUrl: rep.photoUrl,
          });
          await clearQueuedReport(rep.id);
        } catch {
          // Will retry next interval
        }
      }
      toast.success("Synchronized offline flood reports with server.");
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
  // If user actively navigated or panned away (>25km) to another city (e.g. Assam, Delhi),
  // prioritize the active map center so nearest shelters and status reflect what they are viewing.
  // Otherwise prioritize their live GPS coordinate.
  const referenceCoord = useMemo<[number, number]>(() => {
    const cLat = viewportBounds.centerLat;
    const cLng = viewportBounds.centerLng;
    const distToGps = getHaversineDistanceKm(userPos[0], userPos[1], cLat, cLng);
    if (distToGps < 25) {
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
    toast.info(`Viewing ${name}`);
  };

  const handlePlanRouteToShelter = async (shelter: Shelter) => {
    toast.loading("Calculating safest road route avoiding flood areas...", { id: "routing" });
    const blocked = liveIncidents.map((i) => ({
      lat: i.lat,
      lng: i.lng,
      description: i.description,
    }));

    const result = await calculateWorldwideSafeRoute(referenceCoord, [shelter.lat, shelter.lng], blocked);
    toast.dismiss("routing");
    if (result) {
      setRoadRoute(result);
      toast.success(`Route calculated: ${result.distanceKm} km (${result.durationMinutes} min)`);
    } else {
      toast.error("Could not find a road route to this shelter.");
    }
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
    currentUser?.role === "moderator" ||
    currentUser?.role === "admin" ||
    demoMode;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-background select-none font-sans">
      {/* 1. TOP HEADER (SEARCH + GPS + PROFILE) */}
      <ProductionHeader
        onSelectPlace={handleSelectPlace}
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenControlRoom={() => setControlRoomOpen(true)}
        canAccessControlRoom={canAccessControlRoom}
        demoMode={demoMode}
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
          roadRouteCoords={roadRoute?.coordinates}
          roadRouteSafety={roadRoute?.safetyStatus}
          showPredicted={true}
          onTileClick={(tid, lat, lng) => {
            setSelectedTileId(tid);
          }}
          onShelterClick={(shId) => {
            const sh = shelters.find((s) => s.id === shId);
            if (sh) handlePlanRouteToShelter(sh);
          }}
          onBoundsChange={(b) => setViewportBounds(b)}
        />
      </div>

      {/* 3. PERSISTENT 3-SNAP BOTTOM SHEET (PEEK / HALF / FULL) */}
      <ProductionBottomSheet
        currentTile={currentTile}
        weather={weather}
        nearestShelter={nearestShelter}
        roadRoute={roadRoute}
        onPlanRouteToShelter={handlePlanRouteToShelter}
        onOpenReportModal={() => setReportModalOpen(true)}
        onClearRoute={() => setRoadRoute(null)}
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
        alertCount={liveAlerts.length}
        onOpenReport={() => setReportModalOpen(true)}
        onOpenAlerts={() => setAlertsDrawerOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      {/* 5. MODALS & DRAWERS */}
      <ThreeTapReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        userCoords={userPos}
        onReportCreated={handleReportCreated}
      />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={refreshAuth}
        demoMode={demoMode}
        onToggleDemoMode={(val) => setDemoMode(val)}
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
        alerts={liveAlerts}
        mapCenter={userPos}
        onVerifyReport={handleVerifyReport}
        onDismissReport={handleDismissReport}
        onAddIncident={handleAddIncident}
        onAddAlert={handleAddAlert}
      />

      <AlertsDrawer
        open={alertsDrawerOpen}
        alerts={liveAlerts}
        tiles={dynamicTiles}
        viewportTileIds={new Set(dynamicTiles.map((t) => t.id))}
        onClose={() => setAlertsDrawerOpen(false)}
        onSelectAlertTiles={(tids) => {
          if (tids.length > 0) setSelectedTileId(tids[0]);
        }}
        onOpenPreparedness={() => {
          setAlertsDrawerOpen(false);
          setHelpModalOpen(true);
        }}
      />
    </div>
  );
}
