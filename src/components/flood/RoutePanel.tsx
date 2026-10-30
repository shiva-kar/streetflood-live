import { useState } from "react";
import {
  Navigation,
  ArrowUpDown,
  Clock,
  Compass,
  ShieldCheck,
  AlertTriangle,
  X,
  MapPin,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RouteResult } from "@/lib/flood/engine";
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
              Safe Route Navigation
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              A* routing avoiding flooded tiles & road closures
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close route panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form Controls */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="space-y-3">
          {/* Origin Selection */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" />
                Origin Point (A)
              </span>
              <span className="text-xs text-slate-400 font-normal">Start Location</span>
            </label>
            <select
              value={internalFrom}
              onChange={(e) => {
                setInternalFrom(e.target.value);
                onSelectFrom(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500"
            >
              {tiles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.locality} ({t.currentRiskLevel} risk)
                </option>
              ))}
            </select>
          </div>

          {/* Swap Controls */}
          <div className="flex items-center justify-between py-1">
            <button
              type="button"
              onClick={handleSwap}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-semibold px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Swap Origin / Destination</span>
            </button>

            <button
              type="button"
              onClick={onTogglePickMode}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                pickMode
                  ? "bg-sky-600 text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <MousePointerClick className="h-3.5 w-3.5" />
              <span>{pickMode ? "Click Map Pin..." : "Pick on Map"}</span>
            </button>
          </div>

          {/* Destination Selection */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-xs" />
                Destination Point (B)
              </span>
              <span className="text-xs text-slate-400 font-normal">End Location</span>
            </label>
            <select
              value={internalTo}
              onChange={(e) => {
                setInternalTo(e.target.value);
                onSelectTo(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500"
            >
              {tiles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.locality} ({t.currentRiskLevel} risk)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calculate Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            onClick={handleRunRoute}
            className="flex-1 h-10 font-bold text-sm gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Compass className="h-4 w-4" />
            <span>Calculate Safe Route</span>
          </Button>

          {routeResult && (
            <Button
              type="button"
              variant="outline"
              onClick={onClearRoute}
              className="h-10 text-sm font-semibold border-slate-300 dark:border-slate-700"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Popular Landmarks Shortcuts */}
        <div className="space-y-1.5 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Landmark Destinations:
          </span>
          <div className="flex flex-wrap gap-1.5">
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
                className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                {lm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calculation Result Summary Card */}
        {routeResult ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3 mt-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
              <div>
                <span className="text-xs uppercase font-bold text-slate-500">
                  Navigated Distance & Time
                </span>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="font-display font-extrabold text-2xl text-slate-900 dark:text-slate-100">
                    {routeResult.distanceKm.toFixed(1)} km
                  </span>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="h-4 w-4" />~{routeResult.minutes} mins
                  </span>
                </div>
              </div>
              <Badge
                className={`text-xs px-3 py-1 font-bold ${
                  hasHighOrCritical ? "bg-amber-500 text-slate-900" : "bg-emerald-600 text-white"
                }`}
              >
                {hasHighOrCritical ? "⚠️ Caution Route" : "✓ Optimal Route"}
              </Badge>
            </div>

            {/* Path Risk Tiers */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Path Segment Risk Tiers ({routeResult.path.length} blocks traversed):
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-xs">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <div className="font-bold text-sm">{routeResult.counts.Low}</div>
                  <div className="text-[10px] font-sans font-medium">Low</div>
                </div>
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <div className="font-bold text-sm">{routeResult.counts.Moderate}</div>
                  <div className="text-[10px] font-sans font-medium">Mod</div>
                </div>
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                  <div className="font-bold text-sm">{routeResult.counts.High}</div>
                  <div className="text-[10px] font-sans font-medium">High</div>
                </div>
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
                  <div className="font-bold text-sm">{routeResult.counts.Critical}</div>
                  <div className="text-[10px] font-sans font-medium">Critical</div>
                </div>
              </div>
            </div>

            {/* Algorithm Safety Benefit */}
            {routeResult.straightLineRisky > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Algorithm Advantage:</strong> This route safely steered around{" "}
                  <strong>{routeResult.straightLineRisky} severely flooded blocks</strong> that lie
                  directly on the straight-line heading.
                </span>
              </div>
            )}

            {/* High risk warning */}
            {hasHighOrCritical && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs sm:text-sm text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Caution:</strong> Complete avoidance of flooded stretches was not possible
                  due to corridor-wide waterlogging. Proceed slowly or postpone travel.
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200 dark:border-slate-700">
              Note: Demonstration route computed on 100m grid graph. Drive with caution.
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 text-xs sm:text-sm">
            Select origin and destination blocks above, then click{" "}
            <strong>Calculate Safe Route</strong> to view a flood-avoiding route.
          </div>
        )}
      </div>
    </div>
  );
}
