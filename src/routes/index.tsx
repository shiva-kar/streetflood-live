import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Navigation, LocateFixed, Sparkles, ShieldAlert, Sliders, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import FloodMap from "@/components/flood/FloodMap";
import Header from "@/components/flood/Header";
import SafetyBanner from "@/components/flood/SafetyBanner";
import TileDetailsSheet from "@/components/flood/TileDetailsSheet";
import CorridorOverview from "@/components/flood/CorridorOverview";
import ReportDialog from "@/components/flood/ReportDialog";
import RoutePanel from "@/components/flood/RoutePanel";
import AlertsDrawer from "@/components/flood/AlertsDrawer";
import PreparednessModal from "@/components/flood/PreparednessModal";
import SimulationDrawer from "@/components/flood/SimulationDrawer";
import AuthorityDashboard from "@/components/flood/AuthorityDashboard";
import MapLegend from "@/components/flood/MapLegend";
import MapLayerControls from "@/components/flood/MapLayerControls";
import { useAppState, getState } from "@/lib/flood/store";
import {
  computeTiles,
  planRoute,
  predictiveAlerts,
  tileAt,
  type RouteResult,
} from "@/lib/flood/engine";
import { calculateRoadRoute, findBestShelterEvacuation } from "@/lib/flood/roadRouting";
import { MAP_CENTER, SHELTERS, ZONES } from "@/lib/flood/data";
import { toast } from "sonner";
import type { MapLayerOptions, RoadRouteResult, ShelterCandidate, Tile } from "@/lib/flood/types";

export const Route = createFileRoute("/")({
  component: StreetFloodApp,
});

function StreetFloodApp() {
  const state = useAppState();

  // Mode: Resident view vs Authority control room
  const [mode, setMode] = useState<"resident" | "authority">("resident");

  // Overlays & Toggles
  const [showPredicted, setShowPredicted] = useState(true);
  const [onlyHighCritical, setOnlyHighCritical] = useState(false);
  const [showReportsFilter, setShowReportsFilter] = useState<"all" | "unverified" | "none">("all");

  // Selection & Focus
  const [selectedTileId, setSelectedTileId] = useState<string | null>("t_20_16");
  const [selectedTileIds, setSelectedTileIds] = useState<Set<string>>(new Set(["t_20_16"]));
  const [pulseTileId, setPulseTileId] = useState<string | null>(null);
  const [highlightShelterId, setHighlightShelterId] = useState<string | null>(null);
  const [viewportTileIds, setViewportTileIds] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    key: number;
  } | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>([19.048, 72.868]);

  // Route State - Road-Based Evacuation & Navigation
  const [routeFromId, setRouteFromId] = useState<string | null>("t_2_4");
  const [routeToId, setRouteToId] = useState<string | null>("t_20_16");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [roadRoute, setRoadRoute] = useState<RoadRouteResult | null>(null);
  const [shelterCandidates, setShelterCandidates] = useState<ShelterCandidate[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>("sh1");
  const [navMode, setNavMode] = useState<"evacuate" | "custom">("evacuate");
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [pickMode, setPickMode] = useState(false);

  // Map Layer Controls State (Technical Grid ON by default with road corridors)
  const [layerOptions, setLayerOptions] = useState<MapLayerOptions>({
    showTechnicalGrid: true,
    showAffectedRoads: true,
    showClosures: true,
    showShelters: true,
    showEvacuationRoute: true,
    showReports: true,
  });

  // Modal / Drawer visibility
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [prepModalOpen, setPrepModalOpen] = useState(false);
  const [simDrawerOpen, setSimDrawerOpen] = useState(false);

  // Mobile Bottom Sheet expanded state
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Time ticker
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Compute live tiles from state
  const effectiveState = state || getState();
  const tiles = useMemo(() => computeTiles(effectiveState, now), [effectiveState, now]);

  // Combined Alerts: Official published alerts + auto-generated predictive alerts
  const allAlerts = useMemo(() => {
    const auto = predictiveAlerts(tiles, effectiveState, now);
    return [...effectiveState.alerts, ...auto];
  }, [tiles, effectiveState, now]);

  // ONLY targeted municipal official alerts should have tile badges!
  // NEVER include zone-wide predictive alerts that cover hundreds of tiles!
  const alertTileIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of effectiveState.alerts) {
      if (a.status === "Published" && a.type === "Municipal") {
        a.tileIds.forEach((id) => set.add(id));
      }
    }
    return set;
  }, [effectiveState.alerts]);

  // Currently selected tile object
  const selectedTile = useMemo(() => {
    if (!selectedTileId) return null;
    return tiles.find((t) => t.id === selectedTileId) || null;
  }, [tiles, selectedTileId]);

  // Incident active on selected tile
  const selectedIncident = useMemo(() => {
    if (!selectedTileId) return null;
    return effectiveState.incidents.find((i) => i.tileId === selectedTileId) || null;
  }, [effectiveState.incidents, selectedTileId]);

  // Calculate road route via real street network & flood evaluation layer
  const handleCalculateRoadRoute = useCallback(
    async (from: string, to: string) => {
      setIsRoutingLoading(true);
      const fromTile = tiles.find((t) => t.id === from);
      const toTile = tiles.find((t) => t.id === to);
      if (!fromTile || !toTile) {
        setIsRoutingLoading(false);
        return;
      }

      const res = await calculateRoadRoute(
        { lat: fromTile.centerLat, lng: fromTile.centerLng },
        { lat: toTile.centerLat, lng: toTile.centerLng },
        tiles,
        effectiveState.reports,
        effectiveState.incidents,
      );

      setRoadRoute(res);
      setIsRoutingLoading(false);

      if (res.safetyStatus === "Impassable") {
        toast.error(
          "NO SUFFICIENTLY SAFE ROUTE FOUND: Corridor blocked by closure or critical flooding.",
        );
      } else if (res.safetyStatus === "HighRisk") {
        toast.warning("Caution: Road route passes through high waterlogging segments.");
      } else {
        toast.success(
          `Road route calculated: ${res.distanceKm.toFixed(1)} km (~${res.durationMinutes} mins) following street network.`,
        );
      }
    },
    [tiles, effectiveState.reports, effectiveState.incidents],
  );

  // Evacuate to Nearest/Safest Relief Shelter
  const handleEvacuateToShelter = useCallback(
    async (from: string, targetShelterId?: string) => {
      setIsRoutingLoading(true);
      const fromTile = tiles.find((t) => t.id === from);
      const originCoord = fromTile
        ? { lat: fromTile.centerLat, lng: fromTile.centerLng }
        : { lat: 19.0455, lng: 72.8655 };

      const { recommended, candidates } = await findBestShelterEvacuation(
        originCoord,
        SHELTERS,
        tiles,
        effectiveState.reports,
        effectiveState.incidents,
      );

      setShelterCandidates(candidates);

      const targetCandidate = targetShelterId
        ? candidates.find((c) => c.shelter.id === targetShelterId) || recommended
        : recommended;

      if (targetCandidate?.route) {
        setRoadRoute(targetCandidate.route);
        setSelectedShelterId(targetCandidate.shelter.id);
        const targetTileId = tileAt(targetCandidate.shelter.lat, targetCandidate.shelter.lng);
        if (targetTileId) setRouteToId(targetTileId);

        if (targetCandidate.route.safetyStatus === "Impassable") {
          toast.error(
            "Warning: Candidate road route to this shelter encounters road closures or critical inundation.",
          );
        } else {
          toast.success(
            `Evacuation route calculated: ${targetCandidate.shelter.name} (${targetCandidate.route.distanceKm.toFixed(1)} km road route, ~${targetCandidate.route.durationMinutes} mins)`,
          );
        }
      }
      setIsRoutingLoading(false);
    },
    [tiles, effectiveState.reports, effectiveState.incidents],
  );

  // Internal grid routing fallback
  const handleCalculateRoute = useCallback(
    (from: string, to: string) => {
      const res = planRoute(tiles, from, to);
      setRouteResult(res);
      handleCalculateRoadRoute(from, to);
    },
    [tiles, handleCalculateRoadRoute],
  );

  // Auto calculate route when route panel opens
  useEffect(() => {
    if (routePanelOpen && !roadRoute) {
      if (navMode === "evacuate") {
        handleEvacuateToShelter(routeFromId || "t_2_4", selectedShelterId || undefined);
      } else if (routeFromId && routeToId) {
        handleCalculateRoadRoute(routeFromId, routeToId);
      }
    }
  }, [
    routePanelOpen,
    roadRoute,
    navMode,
    routeFromId,
    routeToId,
    selectedShelterId,
    handleEvacuateToShelter,
    handleCalculateRoadRoute,
  ]);

  // Recalculate route when flood state (rainfall, reports, incidents) changes
  useEffect(() => {
    if (routePanelOpen && roadRoute && routeFromId) {
      if (navMode === "evacuate") {
        handleEvacuateToShelter(routeFromId, selectedShelterId || undefined);
      } else if (routeToId) {
        handleCalculateRoadRoute(routeFromId, routeToId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveState.reports, effectiveState.incidents, effectiveState.sim.tick]);

  // Map Tile Click
  const handleTileClick = (tileId: string, lat: number, lng: number) => {
    if (pickMode) {
      if (!routeFromId) {
        setRouteFromId(tileId);
        toast.info("Origin (A) set from map click.");
      } else {
        setRouteToId(tileId);
        toast.info("Destination (B) set from map click.");
        setPickMode(false);
        if (navMode === "custom") {
          handleCalculateRoadRoute(routeFromId, tileId);
        } else {
          handleEvacuateToShelter(tileId, selectedShelterId || undefined);
        }
      }
      return;
    }

    setSelectedTileId(tileId);
    setSelectedTileIds(new Set([tileId]));
    setRoutePanelOpen(false);
    setMobileSheetOpen(true);
  };

  // Shelter click
  const handleShelterClick = (shelterId: string) => {
    setHighlightShelterId(shelterId);
    setSelectedShelterId(shelterId);
    setNavMode("evacuate");
    setRoutePanelOpen(true);
    setMobileSheetOpen(true);
    handleEvacuateToShelter(routeFromId || "t_2_4", shelterId);
  };

  // Zone Quick Jump
  const handleJumpToZone = (zoneKey: string) => {
    const zone = ZONES.find((z) => z.key === zoneKey);
    if (!zone) return;
    const centerRow = (zone.rows[0] + zone.rows[1]) / 2;
    const centerCol = (zone.cols[0] + zone.cols[1]) / 2;
    const t = tiles.find((x) => x.row === Math.floor(centerRow) && x.col === Math.floor(centerCol));
    if (t) {
      setFocus({ lat: t.centerLat, lng: t.centerLng, zoom: 16, key: Date.now() });
      setSelectedTileId(t.id);
      setSelectedTileIds(new Set([t.id]));
      setRoutePanelOpen(false);
    }
  };

  // Locate User (GPS)
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserPos([lat, lng]);
          setFocus({ lat, lng, zoom: 16, key: Date.now() });
          toast.success("Centered on your GPS location.");
        },
        () => {
          setUserPos([19.048, 72.868]);
          setFocus({ lat: 19.048, lng: 72.868, zoom: 16, key: Date.now() });
          toast.info("Centered on Sion–Kurla corridor.");
        },
      );
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 1. Top Persistent Header */}
      <Header
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          if (m === "authority") {
            setRoutePanelOpen(false);
            setMobileSheetOpen(true);
          }
        }}
        state={effectiveState}
        tiles={tiles}
        alerts={allAlerts.filter((a) => a.status === "Published")}
        onOpenAlerts={() => setAlertsDrawerOpen(true)}
        onOpenRoute={() => {
          setRoutePanelOpen((prev) => !prev);
          setMobileSheetOpen(true);
        }}
        onOpenPreparedness={() => setPrepModalOpen(true)}
        onOpenSimulation={() => setSimDrawerOpen(true)}
      />

      {/* 2. Safety Prototype Notice Banner */}
      <SafetyBanner />

      {/* 3. Main Workspace Layout */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
        {/* DESKTOP SIDE PANEL (Always visible on lg+ screens) */}
        <aside
          aria-label="Contextual Command Panel"
          className="hidden lg:flex w-[420px] xl:w-[460px] h-full flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg z-20 shrink-0 overflow-hidden"
        >
          {mode === "authority" ? (
            <AuthorityDashboard
              state={effectiveState}
              tiles={tiles}
              onFocusTile={(id) => {
                const t = tiles.find((x) => x.id === id);
                if (t) {
                  setFocus({ lat: t.centerLat, lng: t.centerLng, zoom: 17, key: Date.now() });
                  setSelectedTileId(id);
                  setSelectedTileIds(new Set([id]));
                }
              }}
              onOpenSimulation={() => setSimDrawerOpen(true)}
            />
          ) : routePanelOpen ? (
            <RoutePanel
              tiles={tiles}
              shelters={SHELTERS}
              reports={effectiveState.reports}
              incidents={effectiveState.incidents}
              roadRoute={roadRoute}
              shelterCandidates={shelterCandidates}
              selectedShelterId={selectedShelterId}
              fromId={routeFromId}
              toId={routeToId}
              navMode={navMode}
              pickMode={pickMode}
              isLoading={isRoutingLoading}
              onNavModeChange={setNavMode}
              onSelectFrom={setRouteFromId}
              onSelectTo={setRouteToId}
              onSelectShelter={(sId) => {
                setSelectedShelterId(sId);
                handleEvacuateToShelter(routeFromId || "t_2_4", sId);
              }}
              onCalculateRoadRoute={handleCalculateRoadRoute}
              onEvacuateToShelter={handleEvacuateToShelter}
              onClearRoute={() => {
                setRoadRoute(null);
                setRouteResult(null);
              }}
              onTogglePickMode={() => setPickMode(!pickMode)}
              onClose={() => setRoutePanelOpen(false)}
              onOpenPreparedness={() => setPrepModalOpen(true)}
            />
          ) : selectedTile ? (
            <TileDetailsSheet
              tile={selectedTile}
              reports={effectiveState.reports}
              incident={selectedIncident}
              onClose={() => setSelectedTileId(null)}
              onReportHere={(id) => {
                setSelectedTileId(id);
                setReportDialogOpen(true);
              }}
              onRouteFrom={(id) => {
                setRouteFromId(id);
                setRoutePanelOpen(true);
                if (routeToId) handleCalculateRoute(id, routeToId);
              }}
              onRouteTo={(id) => {
                setRouteToId(id);
                setRoutePanelOpen(true);
                if (routeFromId) handleCalculateRoute(routeFromId, id);
              }}
              onOpenPreparedness={() => setPrepModalOpen(true)}
            />
          ) : (
            <CorridorOverview
              tiles={tiles}
              state={effectiveState}
              alerts={allAlerts}
              onSelectZone={handleJumpToZone}
              onOpenReport={() => setReportDialogOpen(true)}
              onOpenRoute={() => setRoutePanelOpen(true)}
              onOpenPreparedness={() => setPrepModalOpen(true)}
            />
          )}
        </aside>

        {/* MAP CONTAINER (Fills remaining flex space) */}
        <main className="flex-1 h-full relative overflow-hidden bg-slate-200 dark:bg-slate-900">
          <FloodMap
            tiles={tiles}
            reports={effectiveState.reports}
            incidents={effectiveState.incidents}
            shelters={SHELTERS}
            alertTileIds={alertTileIds}
            routePath={routeResult?.path || null}
            roadRouteCoords={roadRoute?.coordinates || null}
            roadRouteSafety={roadRoute?.safetyStatus}
            routeFromId={routeFromId}
            routeToId={routeToId}
            isShelterDestination={navMode === "evacuate"}
            layerOptions={layerOptions}
            selectedTileId={selectedTileId}
            selectedTileIds={selectedTileIds}
            pulseTileId={pulseTileId}
            highlightShelterId={highlightShelterId}
            showPredicted={showPredicted}
            onlyHighCritical={onlyHighCritical}
            showReports={showReportsFilter}
            userPos={userPos}
            focus={focus}
            pickMode={pickMode}
            onTileClick={handleTileClick}
            onShelterClick={handleShelterClick}
            onViewportChange={setViewportTileIds}
          />

          {/* Map Layer Controls (Feature 5 & 10: Toggle Technical Grid, Roads, Closures, Shelters) */}
          <MapLayerControls
            options={layerOptions}
            onChange={setLayerOptions}
            isAdmin={mode === "authority"}
          />

          {/* Floating Map Controls (Top Left of Map Area) */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[calc(100%-24px)] pointer-events-auto">
            {/* Quick Corridor Jump Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md text-xs no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0">Jump:</span>
              {ZONES.map((z) => (
                <button
                  type="button"
                  key={z.key}
                  onClick={() => handleJumpToZone(z.key)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
                >
                  {z.label}
                </button>
              ))}
            </div>

            {/* Map Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 3-Hour Predictive Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md text-xs">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <label
                  htmlFor="pred-toggle"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  3h Predictive Risk
                </label>
                <Switch
                  id="pred-toggle"
                  checked={showPredicted}
                  onCheckedChange={setShowPredicted}
                  className="scale-90"
                />
              </div>

              {/* Filter: Only High/Critical */}
              <button
                type="button"
                onClick={() => setOnlyHighCritical(!onlyHighCritical)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md backdrop-blur-md transition-all ${
                  onlyHighCritical
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Severe Only</span>
              </button>
            </div>
          </div>

          {/* Floating Bottom Action Buttons (Bottom Left of Map) */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2.5 pointer-events-auto">
            {/* Report Flooding FAB */}
            <Button
              type="button"
              size="lg"
              onClick={() => setReportDialogOpen(true)}
              className="h-11 px-4 sm:px-5 rounded-full font-bold shadow-xl gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
              <span>Report Flooding</span>
            </Button>

            {/* Plan Route FAB (especially useful on mobile) */}
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => {
                setRoutePanelOpen(!routePanelOpen);
                setMobileSheetOpen(true);
              }}
              className="h-11 px-3.5 sm:px-4 rounded-full font-bold shadow-xl gap-1.5 text-xs sm:text-sm border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-50"
            >
              <Navigation className="h-4 w-4 text-indigo-600" />
              <span className="hidden sm:inline">Safe Route</span>
            </Button>

            {/* GPS Locate Button */}
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleLocateMe}
              className="h-11 w-11 rounded-full shadow-xl bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-800 dark:text-slate-200"
              title="Center on my location"
            >
              <LocateFixed className="h-5 w-5" />
            </Button>
          </div>

          {/* Map Legend (Bottom Right) */}
          <MapLegend />

          {/* MOBILE BOTTOM SHEET & BACKDROP (Screens < lg) */}
          {mobileSheetOpen && (
            <>
              <div 
                className="lg:hidden absolute inset-0 bg-black/25 z-25 backdrop-blur-[1px] animate-in fade-in duration-150" 
                onClick={() => setMobileSheetOpen(false)} 
                title="Tap to dismiss"
              />
              <div className="lg:hidden absolute inset-x-0 bottom-0 max-h-[75vh] z-30 flex flex-col rounded-t-2xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {mode === "authority" ? (
                  <AuthorityDashboard
                    state={effectiveState}
                    tiles={tiles}
                    onFocusTile={(id) => {
                      const t = tiles.find((x) => x.id === id);
                      if (t) {
                        setFocus({ lat: t.centerLat, lng: t.centerLng, zoom: 17, key: Date.now() });
                        setSelectedTileId(id);
                        setSelectedTileIds(new Set([id]));
                      }
                      setMobileSheetOpen(false);
                    }}
                    onOpenSimulation={() => setSimDrawerOpen(true)}
                    onClose={() => setMobileSheetOpen(false)}
                  />
                ) : routePanelOpen ? (
                  <RoutePanel
                    tiles={tiles}
                    shelters={SHELTERS}
                    reports={effectiveState.reports}
                    incidents={effectiveState.incidents}
                    roadRoute={roadRoute}
                    shelterCandidates={shelterCandidates}
                    selectedShelterId={selectedShelterId}
                    fromId={routeFromId}
                    toId={routeToId}
                    navMode={navMode}
                    pickMode={pickMode}
                    isLoading={isRoutingLoading}
                    onNavModeChange={setNavMode}
                    onSelectFrom={setRouteFromId}
                    onSelectTo={setRouteToId}
                    onSelectShelter={(sId) => {
                      setSelectedShelterId(sId);
                      handleEvacuateToShelter(routeFromId || "t_2_4", sId);
                    }}
                    onCalculateRoadRoute={handleCalculateRoadRoute}
                    onEvacuateToShelter={handleEvacuateToShelter}
                    onClearRoute={() => {
                      setRoadRoute(null);
                      setRouteResult(null);
                    }}
                    onTogglePickMode={() => setPickMode(!pickMode)}
                    onClose={() => {
                      setRoutePanelOpen(false);
                      setMobileSheetOpen(false);
                    }}
                    onOpenPreparedness={() => setPrepModalOpen(true)}
                  />
                ) : selectedTile ? (
                  <TileDetailsSheet
                    tile={selectedTile}
                    reports={effectiveState.reports}
                    incident={selectedIncident}
                    onClose={() => {
                      setSelectedTileId(null);
                      setMobileSheetOpen(false);
                    }}
                    onReportHere={(id) => {
                      setSelectedTileId(id);
                      setReportDialogOpen(true);
                    }}
                    onRouteFrom={(id) => {
                      setRouteFromId(id);
                      setRoutePanelOpen(true);
                      if (routeToId) handleCalculateRoute(id, routeToId);
                    }}
                    onRouteTo={(id) => {
                      setRouteToId(id);
                      setRoutePanelOpen(true);
                      if (routeFromId) handleCalculateRoute(routeFromId, id);
                    }}
                    onOpenPreparedness={() => setPrepModalOpen(true)}
                  />
                ) : (
                  <CorridorOverview
                    tiles={tiles}
                    state={effectiveState}
                    alerts={allAlerts}
                    onSelectZone={(z) => {
                      handleJumpToZone(z);
                      setMobileSheetOpen(false);
                    }}
                    onOpenReport={() => setReportDialogOpen(true)}
                    onOpenRoute={() => setRoutePanelOpen(true)}
                    onOpenPreparedness={() => setPrepModalOpen(true)}
                    onClose={() => setMobileSheetOpen(false)}
                  />
                )}
              </div>
            </div>
            </>
          )}
        </main>
      </div>

      {/* 4. MODALS & DRAWERS (All portalled to document.body with z-[10000]) */}
      <ReportDialog
        open={reportDialogOpen}
        preselectedTileId={selectedTileId}
        tiles={tiles}
        onClose={() => setReportDialogOpen(false)}
        onReportSubmitted={(tileId) => {
          setSelectedTileId(tileId);
          setSelectedTileIds(new Set([tileId]));
          setPulseTileId(tileId);
          const t = tiles.find((x) => x.id === tileId);
          if (t) {
            setFocus({ lat: t.centerLat, lng: t.centerLng, zoom: 17, key: Date.now() });
          }
        }}
      />

      <AlertsDrawer
        open={alertsDrawerOpen}
        alerts={allAlerts}
        tiles={tiles}
        viewportTileIds={viewportTileIds}
        onClose={() => setAlertsDrawerOpen(false)}
        onSelectAlertTiles={(tileIds) => {
          setSelectedTileIds(new Set(tileIds));
          if (tileIds.length > 0) {
            const first = tiles.find((t) => t.id === tileIds[0]);
            if (first) {
              setFocus({ lat: first.centerLat, lng: first.centerLng, zoom: 16, key: Date.now() });
              setSelectedTileId(first.id);
            }
          }
        }}
        onOpenPreparedness={() => setPrepModalOpen(true)}
      />

      <PreparednessModal
        open={prepModalOpen}
        state={effectiveState}
        selectedTile={selectedTile}
        onClose={() => setPrepModalOpen(false)}
        onHighlightShelter={(shelterId) => {
          setHighlightShelterId(shelterId);
          const sh = SHELTERS.find((s) => s.id === shelterId);
          if (sh) {
            setFocus({ lat: sh.lat, lng: sh.lng, zoom: 17, key: Date.now() });
          }
        }}
      />

      <SimulationDrawer
        open={simDrawerOpen}
        state={effectiveState}
        onClose={() => setSimDrawerOpen(false)}
      />
    </div>
  );
}
