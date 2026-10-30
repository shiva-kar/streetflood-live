import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Navigation,
  LocateFixed,
  Filter,
  Sparkles,
  MapPin,
  LifeBuoy,
  Layers,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import FloodMap from "@/components/flood/FloodMap";
import Header from "@/components/flood/Header";
import SafetyBanner from "@/components/flood/SafetyBanner";
import TileDetailsSheet from "@/components/flood/TileDetailsSheet";
import ReportDialog from "@/components/flood/ReportDialog";
import RoutePanel from "@/components/flood/RoutePanel";
import AlertsDrawer from "@/components/flood/AlertsDrawer";
import PreparednessModal from "@/components/flood/PreparednessModal";
import SimulationDrawer from "@/components/flood/SimulationDrawer";
import AuthorityDashboard from "@/components/flood/AuthorityDashboard";
import MapLegend from "@/components/flood/MapLegend";
import { useAppState, getState } from "@/lib/flood/store";
import { computeTiles, planRoute, predictiveAlerts, type RouteResult } from "@/lib/flood/engine";
import { MAP_CENTER, SHELTERS, ZONES } from "@/lib/flood/data";
import { toast } from "sonner";
import type { Tile } from "@/lib/flood/types";

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
  const [selectedTileIds, setSelectedTileIds] = useState<Set<string>>(new Set());
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

  // Route State
  const [routeFromId, setRouteFromId] = useState<string | null>("t_2_4");
  const [routeToId, setRouteToId] = useState<string | null>("t_20_16");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [pickMode, setPickMode] = useState(false);

  // Modal / Drawer visibility
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [prepModalOpen, setPrepModalOpen] = useState(false);
  const [simDrawerOpen, setSimDrawerOpen] = useState(false);

  // Time ticker for freshness
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

  // Alert tile IDs set for map markers
  const alertTileIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of allAlerts) {
      if (a.status === "Published") {
        a.tileIds.forEach((id) => set.add(id));
      }
    }
    return set;
  }, [allAlerts]);

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

  // Calculate safe route
  const handleCalculateRoute = useCallback(
    (from: string, to: string) => {
      const res = planRoute(tiles, from, to);
      if (!res) {
        toast.error("No traversable route found due to impassable flood blockades.");
        setRouteResult(null);
        return;
      }
      setRouteResult(res);
      toast.success(
        `Safe route calculated: ${res.distanceKm.toFixed(1)} km avoiding flooded segments.`,
      );
    },
    [tiles],
  );

  // Auto calculate route when panel opens if not yet calculated
  useEffect(() => {
    if (routePanelOpen && !routeResult && routeFromId && routeToId) {
      handleCalculateRoute(routeFromId, routeToId);
    }
  }, [routePanelOpen, routeResult, routeFromId, routeToId, handleCalculateRoute]);

  // Map Tile Click
  const handleTileClick = (tileId: string, lat: number, lng: number) => {
    setSelectedTileId(tileId);
    setSelectedTileIds(new Set([tileId]));
  };

  // Shelter click
  const handleShelterClick = (shelterId: string) => {
    setHighlightShelterId(shelterId);
    setPrepModalOpen(true);
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
          toast.success("Centered on your current GPS location.");
        },
        () => {
          // Fallback to default demo user coordinate in Sion-Kurla
          setUserPos([19.048, 72.868]);
          setFocus({ lat: 19.048, lng: 72.868, zoom: 16, key: Date.now() });
          toast.info("Using demo location in Sion–Kurla corridor.");
        },
      );
    }
  };

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground font-sans select-none">
      {/* 1. Header Navigation */}
      <Header
        mode={mode}
        onModeChange={setMode}
        state={effectiveState}
        tiles={tiles}
        alerts={allAlerts.filter((a) => a.status === "Published")}
        onOpenAlerts={() => setAlertsDrawerOpen(true)}
        onOpenRoute={() => setRoutePanelOpen((prev) => !prev)}
        onOpenPreparedness={() => setPrepModalOpen(true)}
        onOpenSimulation={() => setSimDrawerOpen(true)}
      />

      {/* 2. Top Disclaimer Banner */}
      <SafetyBanner />

      {/* 3. Main Map Viewport */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <FloodMap
          tiles={tiles}
          reports={effectiveState.reports}
          incidents={effectiveState.incidents}
          shelters={SHELTERS}
          alertTileIds={alertTileIds}
          routePath={routeResult?.path || null}
          routeFromId={routeFromId}
          routeToId={routeToId}
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

        {/* Floating Map Controls Bar (Top Left) */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[calc(100%-24px)] pointer-events-auto">
          {/* Quick Zone Jump Bar */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 px-1.5 rounded-lg border border-border bg-card/90 backdrop-blur-md shadow-md text-xs no-scrollbar">
            <span className="text-[10px] font-bold text-muted-foreground uppercase px-1 shrink-0">
              Corridor:
            </span>
            {ZONES.map((z) => (
              <button
                type="button"
                key={z.key}
                onClick={() => handleJumpToZone(z.key)}
                className="px-2 py-1 rounded-md text-[11px] font-medium hover:bg-muted text-foreground transition-colors shrink-0"
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* Map Filters & Predictive Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 3-Hour Predictive Toggle */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-card/90 backdrop-blur-md shadow-md text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <label
                htmlFor="pred-toggle"
                className="text-[11px] font-semibold text-foreground cursor-pointer"
              >
                3h Predictive Risk
              </label>
              <Switch
                id="pred-toggle"
                checked={showPredicted}
                onCheckedChange={setShowPredicted}
                className="scale-80"
              />
            </div>

            {/* Filter: Only High/Critical */}
            <button
              type="button"
              onClick={() => setOnlyHighCritical(!onlyHighCritical)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-md backdrop-blur-md transition-all ${
                onlyHighCritical
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-card/90 text-foreground border-border hover:bg-muted"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Severe Only</span>
            </button>
          </div>
        </div>

        {/* Floating Quick Action Buttons (Bottom Left / Center) */}
        <div className="absolute bottom-4 left-3 z-20 flex items-center gap-2 pointer-events-auto">
          {/* Report Flooding FAB */}
          <Button
            type="button"
            size="lg"
            onClick={() => setReportDialogOpen(true)}
            className="h-11 px-4 rounded-full font-bold shadow-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm animate-in zoom-in-95 duration-150"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Report Flooding</span>
          </Button>

          {/* Plan Route FAB */}
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={() => setRoutePanelOpen(!routePanelOpen)}
            className="h-11 px-3.5 rounded-full font-bold shadow-xl gap-1.5 text-xs sm:text-sm border border-border bg-card/95 hover:bg-muted"
          >
            <Navigation className="h-4 w-4 text-route" />
            <span className="hidden sm:inline">Safe Route</span>
          </Button>

          {/* GPS Locate Button */}
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleLocateMe}
            className="h-11 w-11 rounded-full shadow-xl bg-card/95 border-border hover:bg-muted text-foreground"
            title="Center on my location"
          >
            <LocateFixed className="h-4 w-4" />
          </Button>
        </div>

        {/* Map Legend (Bottom Right) */}
        <MapLegend />

        {/* 4. Tile Details Bottom Sheet / Side Card (Feature 1 & Feature 6) */}
        {selectedTile && (
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
        )}

        {/* 5. Safe Route Navigation Panel (Feature 3) */}
        {routePanelOpen && (
          <RoutePanel
            tiles={tiles}
            routeResult={routeResult}
            fromId={routeFromId}
            toId={routeToId}
            pickMode={pickMode}
            onSelectFrom={setRouteFromId}
            onSelectTo={setRouteToId}
            onCalculateRoute={handleCalculateRoute}
            onClearRoute={() => setRouteResult(null)}
            onTogglePickMode={() => setPickMode(!pickMode)}
            onClose={() => setRoutePanelOpen(false)}
          />
        )}

        {/* 6. Municipal Control Room Dashboard (Feature 5) */}
        {mode === "authority" && (
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
        )}
      </main>

      {/* 7. Crowdsourced Photo & Report Submission Dialog (Feature 2) */}
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

      {/* 8. Targeted Alert Notifications Drawer (Feature 4) */}
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

      {/* 9. Emergency Preparedness & Evacuation Assistance Modal (Feature 7) */}
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

      {/* 10. Simulation Sandbox Drawer */}
      <SimulationDrawer
        open={simDrawerOpen}
        state={effectiveState}
        onClose={() => setSimDrawerOpen(false)}
      />
    </div>
  );
}
