import { useState } from "react";
import {
  Navigation,
  ArrowUpDown,
  MapPin,
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  Compass,
  CornerDownRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { planRoute, type RouteResult } from "@/lib/flood/engine";
import type { Tile } from "@/lib/flood/types";

interface RoutePanelProps {
  tiles: Tile[];
  routeResult: RouteResult | null;
  fromId: string | null;
  toId: string | null;
  pickMode: boolean;
  onSelectFrom: (tileId: string) => void;
  onSelectTo: (tileId: string) => void;
  onCalculateRoute: (from: string, to: string) => void;
  onClearRoute: () => void;
  onTogglePickMode: () => void;
  onClose: () => void;
}

const PRESET_LANDMARKS = [
  { label: "Sion Hospital / Circle", row: 2, col: 4 },
  { label: "Kurla West Station", row: 20, col: 16 },
  { label: "Chunabhatti Bus Stand", row: 6, col: 17 },
  { label: "Mithi River Edge (SW)", row: 15, col: 1 },
  { label: "LBS Marg Junction", row: 18, col: 14 },
  { label: "Sion–Kurla Link Road", row: 10, col: 12 },
];

export default function RoutePanel({
  tiles,
  routeResult,
  fromId,
  toId,
  pickMode,
  onSelectFrom,
  onSelectTo,
  onCalculateRoute,
  onClearRoute,
  onTogglePickMode,
  onClose,
}: RoutePanelProps) {
  const [internalFrom, setInternalFrom] = useState(fromId || "t_2_4");
  const [internalTo, setInternalTo] = useState(toId || "t_20_16");

  const handleSwap = () => {
    const tmp = internalFrom;
    setInternalFrom(internalTo);
    setInternalTo(tmp);
    if (internalTo && tmp) {
      onSelectFrom(internalTo);
      onSelectTo(tmp);
      onCalculateRoute(internalTo, tmp);
    }
  };

  const handleRunRoute = () => {
    if (!internalFrom || !internalTo) return;
    onSelectFrom(internalFrom);
    onSelectTo(internalTo);
    onCalculateRoute(internalFrom, internalTo);
  };

  const hasHighOrCritical =
    routeResult && (routeResult.counts.High > 0 || routeResult.counts.Critical > 0);

  return (
    <div className="absolute top-16 right-3 sm:right-5 w-[calc(100%-24px)] sm:w-96 max-h-[85vh] z-30 flex flex-col rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden transition-all animate-in slide-in-from-top-3 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-route/15 text-route font-bold">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-foreground">Plan Safe Route</h3>
            <p className="text-[10px] text-muted-foreground">
              A* navigation dynamically avoiding flooded & closed tiles
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Close route panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Inputs */}
      <div className="p-3.5 space-y-3 text-xs overflow-y-auto">
        <div className="space-y-2">
          {/* Origin */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Origin (A)
              </span>
              <span className="text-[10px] text-muted-foreground">Start point</span>
            </label>
            <select
              value={internalFrom}
              onChange={(e) => {
                setInternalFrom(e.target.value);
                onSelectFrom(e.target.value);
              }}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-primary"
            >
              {tiles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.locality} ({t.currentRiskLevel} risk)
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={handleSwap}
              className="p-1 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
              title="Swap origin and destination"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-route">
                <span className="h-2 w-2 rounded-full bg-route" />
                Destination (B)
              </span>
              <span className="text-[10px] text-muted-foreground">End point</span>
            </label>
            <select
              value={internalTo}
              onChange={(e) => {
                setInternalTo(e.target.value);
                onSelectTo(e.target.value);
              }}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-primary"
            >
              {tiles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.locality} ({t.currentRiskLevel} risk)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={handleRunRoute}
            className="flex-1 font-semibold text-xs gap-1.5"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Find Safe Route</span>
          </Button>

          {routeResult && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearRoute}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Quick Landmarks Chips */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-semibold text-muted-foreground">
            Popular Landmarks:
          </span>
          <div className="flex flex-wrap gap-1">
            {PRESET_LANDMARKS.map((lm, i) => (
              <button
                type="button"
                key={i}
                onClick={() => {
                  const id = `t_${lm.row}_${lm.col}`;
                  setInternalTo(id);
                  onSelectTo(id);
                  onCalculateRoute(internalFrom, id);
                }}
                className="text-[10px] px-2 py-0.5 rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
              >
                To: {lm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Card */}
        {routeResult ? (
          <div className="rounded-lg border border-border bg-background p-3 space-y-2.5 mt-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Safe Navigation Route
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-display font-bold text-lg text-foreground">
                    {routeResult.distanceKm.toFixed(1)} km
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />~{routeResult.minutes} mins
                  </span>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 font-semibold ${
                  hasHighOrCritical
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                }`}
              >
                {hasHighOrCritical ? "⚠️ Caution Route" : "✓ Optimal Safe Route"}
              </Badge>
            </div>

            {/* Risk Breakdown along path */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground">
                Path Risk Breakdown ({routeResult.path.length} tiles traversed):
              </span>
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                <div className="p-1 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                  <div className="font-bold">{routeResult.counts.Low}</div>
                  <div className="text-[9px]">Low</div>
                </div>
                <div className="p-1 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                  <div className="font-bold">{routeResult.counts.Moderate}</div>
                  <div className="text-[9px]">Mod</div>
                </div>
                <div className="p-1 rounded bg-orange-500/10 text-orange-800 dark:text-orange-300 border border-orange-500/20">
                  <div className="font-bold">{routeResult.counts.High}</div>
                  <div className="text-[9px]">High</div>
                </div>
                <div className="p-1 rounded bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/20">
                  <div className="font-bold">{routeResult.counts.Critical}</div>
                  <div className="text-[9px]">Critical</div>
                </div>
              </div>
            </div>

            {/* Safety Value Comparison */}
            {routeResult.straightLineRisky > 0 && (
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-950 dark:text-emerald-200 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Algorithm Advantage:</strong> This route safely diverted around{" "}
                  <strong>{routeResult.straightLineRisky} high-risk flooded tile(s)</strong> that
                  lie on the direct straight path.
                </span>
              </div>
            )}

            {/* Warning if High tiles exist */}
            {hasHighOrCritical && (
              <div className="p-2 rounded bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-950 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Notice:</strong> Complete avoidance of flooded areas was impossible due to
                  widespread waterlogging. Proceed with extreme caution or avoid travel.
                </span>
              </div>
            )}

            <p className="text-[9px] text-muted-foreground italic border-t pt-2">
              Note: Demonstration route generated on approximate 100m grid. Not a certified
              emergency navigation route.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-dashed border-border text-center text-muted-foreground text-xs">
            Select start and destination blocks, then click <strong>Find Safe Route</strong> to
            calculate a flood-avoiding path.
          </div>
        )}
      </div>
    </div>
  );
}
