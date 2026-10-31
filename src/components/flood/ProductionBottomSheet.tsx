import { useState } from "react";
import { ChevronUp, ChevronDown, Navigation, CloudRain, ShieldCheck, AlertTriangle, ExternalLink, HelpCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCivicSafetyStatus } from "@/lib/flood/dynamicGrid";
import { useI18n } from "@/lib/i18n";
import type { RoadRouteResult, Shelter, Tile } from "@/lib/flood/types";
import type { RealWeatherResult } from "@/lib/flood/openData";

interface ProductionBottomSheetProps {
  currentTile: Tile | null;
  weather: RealWeatherResult | null;
  nearestShelter: Shelter | null;
  roadRoute: RoadRouteResult | null;
  onPlanRouteToShelter: (shelter: Shelter) => void;
  onOpenReportModal: () => void;
  onClearRoute: () => void;
}

export default function ProductionBottomSheet({
  currentTile,
  weather,
  nearestShelter,
  roadRoute,
  onPlanRouteToShelter,
  onOpenReportModal,
  onClearRoute,
}: ProductionBottomSheetProps) {
  const t = useI18n();
  // Snap heights: 0 = peek (~80px), 1 = half (~340px), 2 = full (~80vh)
  const [snapState, setSnapState] = useState<0 | 1 | 2>(0);
  const [showTechnicalMath, setShowTechnicalMath] = useState(false);

  const score = currentTile?.currentSeverityScore ?? 0;
  const closure = currentTile?.closure;
  const civicStatus = getCivicSafetyStatus(score, closure);

  const toggleSnap = () => {
    setSnapState((prev) => (prev === 0 ? 1 : prev === 1 ? 2 : 0));
  };

  const openGoogleMapsRoute = () => {
    if (!roadRoute || roadRoute.coordinates.length < 2) return;
    const dest = roadRoute.coordinates[roadRoute.coordinates.length - 1];
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest[0]},${dest[1]}`, "_blank");
  };

  return (
    <div
      className={`fixed left-0 right-0 z-30 max-w-xl mx-auto bg-background/98 backdrop-blur-xl border-t border-x shadow-2xl transition-all duration-300 rounded-t-3xl flex flex-col ${
        snapState === 0
          ? "bottom-14 sm:bottom-16 h-22"
          : snapState === 1
          ? "bottom-14 sm:bottom-16 h-88"
          : "bottom-14 sm:bottom-16 h-[78vh]"
      }`}
    >
      {/* DRAG HANDLE & PEEK HEADER */}
      <div
        onClick={toggleSnap}
        className="w-full pt-2 pb-2 px-4 cursor-pointer flex flex-col items-center select-none"
      >
        <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30 mb-2" />
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: civicStatus.colorHex }}
            />
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {civicStatus.headline}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {civicStatus.subhead}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className="text-[10px] font-bold px-2 py-0.5"
              style={{ borderColor: civicStatus.colorHex, color: civicStatus.colorHex }}
            >
              Score {score}/100
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              {snapState === 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* EXPANDED CONTENT (HALF & FULL SNAP) */}
      {snapState > 0 && (
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3.5 text-xs">
          {/* WEATHER & RAINFALL SUMMARY */}
          {weather && (
            <div className="p-3 rounded-2xl bg-muted/50 border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CloudRain className="w-4 h-4 text-sky-500 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Live Rainfall: {weather.recentRainMm} mm/h
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Next 3 Hours Forecast: {weather.forecastRain3hMm} mm
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300">
                Open-Meteo
              </span>
            </div>
          )}

          {/* ACTIVE ROAD ROUTE RESULTS */}
          {roadRoute && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    Safe Evacuation Route ({roadRoute.distanceKm} km • {roadRoute.durationMinutes} min)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClearRoute}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                {roadRoute.safetyMessage}
              </p>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={openGoogleMapsRoute}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 flex-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Google Maps
                </Button>
              </div>

              {/* Turn-by-turn steps in Full Snap */}
              {snapState === 2 && roadRoute.steps.length > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20 space-y-1.5 max-h-40 overflow-y-auto">
                  <p className="font-semibold text-[11px] text-foreground">Turn-by-turn guidance:</p>
                  {roadRoute.steps.map((s, idx) => (
                    <div key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="font-mono text-emerald-600 font-bold">{idx + 1}.</span>
                      <span>
                        {s.instruction} onto <strong>{s.streetName}</strong> ({s.distanceMeters}m)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NEAREST SHELTER CARD */}
          {nearestShelter && !roadRoute && (
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                  {t.nearestShelter}
                </span>
                <p className="font-bold text-foreground text-xs truncate mt-0.5">
                  {nearestShelter.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {nearestShelter.address} • {nearestShelter.capacityStatus}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onPlanRouteToShelter(nearestShelter)}
                className="h-8 text-xs shrink-0 gap-1.5 shadow-sm font-semibold"
              >
                <Navigation className="w-3.5 h-3.5" />
                {t.directions}
              </Button>
            </div>
          )}

          {/* EXPANDABLE "WHY THIS SAFETY SCORE?" */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTechnicalMath(!showTechnicalMath)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              {t.whyExplanation}
            </button>

            {showTechnicalMath && currentTile && (
              <div className="mt-2 p-3 rounded-xl bg-muted/60 border space-y-1.5 text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground">Active Risk Factors & Reports:</p>
                {currentTile.severityBreakdown.map((item, i) => (
                  <p key={i}>• {item}</p>
                ))}
                {currentTile.predictionReasons.length > 0 && (
                  <div className="pt-1 mt-1 border-t">
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
      )}
    </div>
  );
}
