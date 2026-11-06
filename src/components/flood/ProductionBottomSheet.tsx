import { useEffect, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Navigation,
  CloudRain,
  HelpCircle,
  ExternalLink,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Minimize2,
  Maximize2,
  Plus,
  Bell,
  LifeBuoy,
  Volume2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCivicSafetyStatus } from "@/lib/flood/dynamicGrid";
import { useI18n } from "@/lib/i18n";
import type { EvacuationMode, RoadRouteResult, Shelter, Tile } from "@/lib/flood/types";
import type { RealWeatherResult } from "@/lib/flood/openData";
import { getCurrentTideStatus } from "@/lib/flood/tideData";
import { speakTurnInstruction, cancelVoiceAnnouncements } from "@/lib/flood/voiceAnnouncer";

interface ProductionBottomSheetProps {
  onOpenCivicAssistant?: () => void;
  onOpenHackathonShowcase?: () => void;
  onOpenImpactDashboard?: () => void;
  onOpenIbmBobShowcase?: () => void;
  onOpenIbmBobCopilot?: () => void;
  currentTile: Tile | null;
  weather: RealWeatherResult | null;
  nearestShelter: (Shelter & { distanceKm?: number; distanceLabel?: string }) | null;
  roadRoute: RoadRouteResult | null;
  onPlanRouteToShelter: (shelter: Shelter) => void;
  onOpenReportModal: () => void;
  onClearRoute: () => void;
  onOpenAlerts?: () => void;
  onOpenHelp?: () => void;
  alertCount?: number;
  reports?: import("@/lib/flood/types").FloodReport[];
  offlineQueuedCount?: number;
  evacuationMode?: EvacuationMode;
  onEvacuationModeChange?: (mode: EvacuationMode) => void;
  onOpenShelterDetails?: (shelter: Shelter) => void;
  onOpenAllShelters?: () => void;
  sheltersCount?: number;
  activeCityName?: string;
  isNationalView?: boolean;
  onSelectCity?: (city: string, lat: number, lng: number) => void;
}

export default function ProductionBottomSheet({
  currentTile,
  weather,
  nearestShelter,
  roadRoute,
  onPlanRouteToShelter,
  onOpenReportModal,
  onClearRoute,
  onOpenAlerts,
  onOpenHelp,
  alertCount = 0,
  evacuationMode = "car",
  onEvacuationModeChange,
  onOpenShelterDetails,
  onOpenAllShelters,
  sheltersCount = 0,
  reports = [],
  offlineQueuedCount = 0,
  activeCityName,
  isNationalView = false,
  onSelectCity,
  onOpenHackathonShowcase,
  onOpenImpactDashboard,
  onOpenIbmBobShowcase,
  onOpenCivicAssistant,
  onOpenIbmBobCopilot,
}: ProductionBottomSheetProps) {
  const t = useI18n();
  // Mobile snap heights: 0 = peek (56px), 1 = half (360px), 2 = full (80vh)
  const [mobileSnap, setMobileSnap] = useState<0 | 1 | 2>(0);
  // Desktop collapsed state
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [showTechnicalMath, setShowTechnicalMath] = useState(false);
  const [audioGuidance, setAudioGuidance] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const score = currentTile?.currentSeverityScore ?? 0;
  const closure = currentTile?.closure;
  const civicStatus = getCivicSafetyStatus(score, closure);
  const tide = getCurrentTideStatus(new Date(), weather?.rainRateMmPerHour ?? weather?.recentRainMm ?? 0);

  const toggleMobileSnap = () => {
    setMobileSnap((prev) => (prev === 0 ? 1 : prev === 1 ? 2 : 0));
  };

  const openGoogleMapsRoute = () => {
    if (!roadRoute || roadRoute.coordinates.length < 2) return;
    const dest = roadRoute.coordinates[roadRoute.coordinates.length - 1];
    if (!dest) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest[0]},${dest[1]}`, "_blank");
  };

  return (
    <div
      className={`fixed z-30 transition-all duration-300 bg-background/98 backdrop-blur-xl border-border shadow-2xl flex flex-col
        /* Mobile: Full-width bottom sheet anchored directly flush above bottom nav (h-14) */
        left-0 right-0 bottom-14 w-full rounded-t-2xl border-t
        /* Desktop: Floating left sidebar card with rounded corners and no overlap */
        sm:left-4 sm:right-auto sm:top-20 sm:bottom-auto sm:w-[400px] sm:rounded-2xl sm:border sm:shadow-2xl
        ${
          /* Mobile height based on snap */
          mobileSnap === 0
            ? "h-14 sm:h-auto sm:max-h-[calc(100dvh-6.5rem)]"
            : mobileSnap === 1
            ? "h-[360px] sm:h-auto sm:max-h-[calc(100dvh-6.5rem)]"
            : "h-[80vh] sm:h-auto sm:max-h-[calc(100dvh-6.5rem)]"
        }
      `}
    >
      {/* DRAG HANDLE & STATUS HEADER */}
      <div
        onClick={toggleMobileSnap}
        className="w-full pt-2 pb-2 px-4 cursor-pointer flex flex-col items-center select-none"
      >
        {/* Mobile drag bar */}
        <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30 mb-1.5 sm:hidden" />

        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: civicStatus.colorHex }}
            />
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {currentTile?.locality || activeCityName || "Monitored Region"}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {currentTile?.ward ? `${currentTile.ward} • ${civicStatus.headline}` : civicStatus.headline}
              </p>
            </div>
            {!isOnline && (
              <div className="mx-4 mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                Offline • {offlineQueuedCount || 1} report{offlineQueuedCount === 1 ? "" : "s"} queued
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
            className="rounded-md px-2 py-0.5 text-[10px] font-bold"
              style={{ borderColor: civicStatus.colorHex, color: civicStatus.colorHex }}
            >
              Score {score}/100
            </Badge>

            {/* Mobile Snap Chevron */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground sm:hidden"
            >
              {mobileSnap === 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {/* Desktop Collapse Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setDesktopCollapsed(!desktopCollapsed);
              }}
              className="hidden sm:inline-flex h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title={desktopCollapsed ? "Expand card" : "Collapse card"}
            >
              {desktopCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* DESKTOP PRIMARY ACTION BAR */}
      <div className={`hidden sm:grid grid-cols-2 gap-2.5 pt-1.5 pb-2.5 px-4 border-b border-border/60 ${desktopCollapsed ? "sm:hidden" : ""}`}>
        <Button
          size="sm"
          onClick={onOpenReportModal}
          className="h-9 text-xs bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 shadow-sm rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.tabReport}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (nearestShelter && (!nearestShelter.distanceKm || nearestShelter.distanceKm <= 75)) {
              onPlanRouteToShelter(nearestShelter);
            } else if (onOpenAllShelters) {
              onOpenAllShelters();
            }
          }}
          disabled={!nearestShelter && !onOpenAllShelters}
          className="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border hover:bg-muted cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{nearestShelter && (!nearestShelter.distanceKm || nearestShelter.distanceKm <= 75) ? t.safeRoute : "Find Shelters"}</span>
        </Button>
      </div>

      {/* CIVIC AI ASSISTANT ACTION PILL */}
      {(onOpenCivicAssistant || onOpenIbmBobCopilot) && (
        <div className={`px-4 pt-2 ${desktopCollapsed ? "sm:hidden" : ""}`}>
          <button
            type="button"
            onClick={onOpenCivicAssistant || onOpenIbmBobCopilot}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-600/10 via-blue-600/10 to-indigo-500/10 hover:border-sky-500/50 hover:bg-sky-500/20 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-600 text-[10px] font-black text-white shadow-xs">
                AI
              </span>
              <span className="font-bold text-foreground">Ask Civic AI Assistant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold hidden sm:inline">
                Real-Time Advice
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* QUICK SHOWCASE & IMPACT SHORTCUTS */}
      {(onOpenHackathonShowcase || onOpenIbmBobShowcase || onOpenImpactDashboard) && (
        <div className={`px-4 pt-1.5 flex gap-2 ${desktopCollapsed ? "sm:hidden" : ""}`}>
          {(onOpenHackathonShowcase || onOpenIbmBobShowcase) && (
            <button
              type="button"
              onClick={onOpenHackathonShowcase || onOpenIbmBobShowcase}
              className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/15 text-[11px] font-semibold text-sky-700 dark:text-sky-300 transition-colors cursor-pointer"
            >
              <span>Build for Bengaluru</span>
            </button>
          )}
          {onOpenImpactDashboard && (
            <button
              type="button"
              onClick={onOpenImpactDashboard}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium text-foreground transition-colors cursor-pointer"
            >
              <span>Impact Metrics</span>
            </button>
          )}
        </div>
      )}

      {/* BODY CONTENT */}
      {/* Visible on Mobile when snap > 0; Visible on Desktop unless desktopCollapsed */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-3 space-y-3.5 text-xs transition-opacity duration-200 ${
          mobileSnap === 0 ? "hidden sm:block" : "block"
        } ${desktopCollapsed ? "sm:hidden" : "sm:block"}`}
      >
        {/* 1. REAL-TIME RAINFALL (Open-Meteo) */}
        {weather && (
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <CloudRain className="w-4 h-4 text-sky-500 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">
                  Rainfall now: {weather.recentRainMm} mm/h
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Next 3 hours: {weather.forecastRain3hMm} mm expected
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                weather.sourceStatus === "live"
                  ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : weather.sourceStatus === "cached"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {weather.sourceStatus === "live"
                ? "Live (Open-Meteo)"
                : weather.sourceStatus === "cached"
                ? "Cached Radar"
                : "Telemetry Offline"}
            </span>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">
              {isNationalView ? "National Drainage & River Basin Flow" : "Stormwater Drainage & Rajakaluve Indicator"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isNationalView
                ? "Active municipal stormwater pumps and river catchment discharge monitored."
                : "BBMP primary stormwater drains (Rajakaluves) & lake interconnects operating normally"}
            </p>
          </div>
          <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
            Drainage operating
          </span>
        </div>

        {/* 2. ACTIVE ROAD EVACUATION ROUTE */}
        {roadRoute && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 shadow-xs">
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-background/70 p-1 border border-border">
              {([
                ["pedestrian", "🚶 Walk"],
                ["twowheeler", "🛵 2-Wheeler"],
                ["car", "🚗 Car"],
                ["heavyRescue", "🚒 Rescue"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onEvacuationModeChange?.(mode)}
                  className={`min-h-11 rounded-lg text-[10px] font-semibold ${evacuationMode === mode ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  {roadRoute.provider === "CorridorFallback" ? "Direct Corridor" : "Safe Route"} ({roadRoute.distanceKm} km • ~{roadRoute.durationMinutes} min)
                </span>
                {roadRoute.provider === "CorridorFallback" && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 font-semibold">
                    Direct Bearing
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={onClearRoute}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Clear
              </button>
            </div>
            <Button
              type="button"
              variant={audioGuidance ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                const next = !audioGuidance;
                setAudioGuidance(next);
                if (next && roadRoute.steps[0]) speakTurnInstruction(roadRoute.steps[0]);
                else cancelVoiceAnnouncements();
              }}
            >
              <Volume2 className="w-3.5 h-3.5" /> Audio Guidance
            </Button>

            <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
              {roadRoute.safetyMessage}
            </p>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={openGoogleMapsRoute}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 flex-1 shadow-sm font-semibold cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Google Maps
              </Button>
            </div>

            {/* Turn-by-turn guidance */}
            {roadRoute.steps.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-500/20 space-y-1.5 max-h-40 overflow-y-auto">
                <p className="font-semibold text-[11px] text-foreground">Turn-by-turn directions:</p>
                {roadRoute.steps.map((s, idx) => (
                  <div key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {idx + 1}.
                    </span>
                    <span>
                      {s.instruction} onto <strong>{s.streetName}</strong> ({s.distanceMeters}m)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. VERIFIED EMERGENCY SHELTERS */}
        {nearestShelter && !roadRoute && (
          (isNationalView || (nearestShelter.distanceKm != null && nearestShelter.distanceKm > 75)) ? (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Emergency Relief Shelters
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-primary/10 text-primary border-none">
                    National Network
                  </Badge>
                </div>
                {onOpenAllShelters && (
                  <button
                    type="button"
                    onClick={onOpenAllShelters}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Directory ({sheltersCount > 0 ? sheltersCount : "All"})
                  </button>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Zoom into any district or select a region below to view neighborhood shelters and live safe routes.
              </p>

              {/* REGIONAL QUICK HUBS */}
              {onSelectCity && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    { city: "Bengaluru", lat: 12.9716, lng: 77.5946 },
                    { city: "Delhi", lat: 28.6139, lng: 77.2090 },
                    { city: "Mumbai", lat: 19.0760, lng: 72.8777 },
                    { city: "Kolkata", lat: 22.5726, lng: 88.3639 },
                    { city: "Guwahati", lat: 26.1445, lng: 91.7362 },
                    { city: "Odisha", lat: 20.2961, lng: 85.8245 },
                    { city: "Chennai", lat: 13.0827, lng: 80.2707 },
                    { city: "Hyderabad", lat: 17.3850, lng: 78.4867 },
                  ].map((preset) => (
                    <button
                      key={preset.city}
                      type="button"
                      onClick={() => onSelectCity(preset.city, preset.lat, preset.lng)}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background border border-border/80 hover:bg-primary/10 hover:border-primary/40 text-foreground transition-colors cursor-pointer"
                    >
                      {preset.city}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                {onOpenAllShelters && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenAllShelters}
                    className="h-8 text-xs flex-1 font-semibold border-border hover:bg-muted"
                  >
                    Browse All Shelters
                  </Button>
                )}
                {onOpenShelterDetails && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onOpenShelterDetails(nearestShelter)}
                    className="h-8 text-xs flex-1 font-semibold"
                  >
                    View {nearestShelter.name.split(" ")[0]} Hub
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                    {t.nearestShelter}
                  </span>
                  {nearestShelter.distanceLabel && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 h-4 font-bold bg-primary/10 text-primary border-none"
                    >
                      {nearestShelter.distanceLabel}
                    </Badge>
                  )}
                </div>
                {onOpenAllShelters && (
                  <button
                    type="button"
                    onClick={onOpenAllShelters}
                    className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    View All ({sheltersCount > 0 ? sheltersCount : "Directory"})
                  </button>
                )}
              </div>

              <div>
                <p className="font-bold text-foreground text-xs truncate">
                  {nearestShelter.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {nearestShelter.address} • {nearestShelter.capacityStatus}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {nearestShelter.drinkingWater && <Badge variant="secondary" className="text-[9px]">💧 Water</Badge>}
                  {nearestShelter.medicalAid && <Badge variant="secondary" className="text-[9px]">🏥 First Aid</Badge>}
                  {nearestShelter.wheelchairAccessible && <Badge variant="secondary" className="text-[9px]">♿ Accessible</Badge>}
                  {nearestShelter.petFriendly && <Badge variant="secondary" className="text-[9px]">🐕 Pet Friendly</Badge>}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-primary/15">
                {onOpenShelterDetails && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenShelterDetails(nearestShelter)}
                    className="h-8 text-xs flex-1 border-primary/30 hover:bg-primary/10 font-semibold"
                  >
                    Facility Details
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => onPlanRouteToShelter(nearestShelter)}
                  className="h-8 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  {t.directions}
                </Button>
              </div>
            </div>
          )
        )}

        {/* CITIZEN REPORT EVIDENCE PHOTOS */}
        {currentTile && reports.filter((report) => report.tileId === currentTile.id && report.photoUrl).length > 0 && (
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-3 space-y-2">
            <p className="text-[11px] font-bold text-foreground">Citizen report evidence</p>
            <div className="grid grid-cols-3 gap-2">
              {reports.filter((report) => report.tileId === currentTile.id && report.photoUrl).map((report) => (
                <button
                  type="button"
                  key={report.id}
                  onClick={() => setSelectedPhoto(report.photoUrl || null)}
                  className="relative aspect-square overflow-hidden rounded-lg border border-border"
                  aria-label={`View ${report.status.toLowerCase()} flood report photo from ${new Date(report.createdAt).toLocaleString()}`}
                >
                  <img src={report.photoUrl} alt="Citizen flood report" className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                    {report.status === "Verified" ? "✓ Verified" : report.severityUser}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedPhoto && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close photo preview" onClick={() => setSelectedPhoto(null)} />
            <img src={selectedPhoto} alt="Flood report evidence enlarged" className="relative max-h-[85vh] max-w-full rounded-xl object-contain" />
          </div>
        )}

        {/* 4. EXPANDABLE TECHNICAL SAFETY BREAKDOWN */}
        <div className="pt-1 border-t border-border/60">
          <button
            type="button"
            onClick={() => setShowTechnicalMath(!showTechnicalMath)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            {t.whyExplanation}
          </button>

          {showTechnicalMath && currentTile && (
            <div className="mt-2 p-3 rounded-xl bg-muted/60 border border-border/80 space-y-1.5 text-[11px] text-muted-foreground">
              <p className="font-semibold text-foreground">Active Risk Factors & Reports:</p>
              {currentTile.severityBreakdown.length > 0 ? (
                currentTile.severityBreakdown.map((item, i) => <p key={i}>• {item}</p>)
              ) : (
                <p>• Normal ground elevation, no active flood reports or road closures logged.</p>
              )}
              {currentTile.predictionReasons.length > 0 && (
                <div className="pt-1.5 mt-1.5 border-t border-border/60">
                  <p className="font-semibold text-foreground">3-Hour Early Forecast Advisory:</p>
                  {currentTile.predictionReasons.map((reason, i) => (
                    <p key={i}>• {reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
