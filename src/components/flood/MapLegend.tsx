import { useState } from "react";
import { ChevronUp, ChevronDown, X, Info } from "lucide-react";

export default function MapLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 pointer-events-auto">
      {/* Expanded Popover (Opens Upward) */}
      {expanded && (
        <div className="absolute bottom-full mb-2 right-0 w-64 sm:w-72 max-w-[calc(100vw-24px)] rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-3 sm:p-3.5 space-y-3 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[65vh] overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
              <span>Flood Risk Legend</span>
            </span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close legend"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Risk Level Tiers */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-500 text-[10px] sm:text-[11px] uppercase tracking-wider">
              100m² Tile Severity Tiers:
            </span>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-xs bg-emerald-500 shadow-2xs shrink-0" />
                <span className="font-medium text-[11px] sm:text-xs">Low (0–19)</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-xs bg-amber-500 shadow-2xs shrink-0" />
                <span className="font-medium text-[11px] sm:text-xs">Moderate (20–39)</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-xs bg-orange-500 shadow-2xs shrink-0" />
                <span className="font-medium text-[11px] sm:text-xs">High (40–69)</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-xs bg-red-600 shadow-2xs shrink-0" />
                <span className="font-medium text-[11px] sm:text-xs">Critical (70–100)</span>
              </div>
            </div>
          </div>

          {/* Map Symbols */}
          <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-2.5">
            <span className="font-bold text-slate-500 text-[10px] sm:text-[11px] uppercase tracking-wider">
              Map Overlays:
            </span>
            <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs shrink-0" />
                <span>Verified Report (Municipal)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-amber-500 bg-transparent shrink-0" />
                <span>Unverified Citizen Report</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  ⛔
                </span>
                <span>Official Road Closure</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-md bg-emerald-700 text-white flex items-center justify-center text-[10px] shrink-0">
                  ⌂
                </span>
                <span>Relief Shelter / Relief Center</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-dashed border-amber-500 shrink-0" />
                <span>3h Predicted Moderate Risk Outline</span>
              </div>
            </div>
          </div>

          {/* Street Road Risk Legend (Feature 10) */}
          <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-2.5">
            <span className="font-bold text-slate-500 text-[10px] sm:text-[11px] uppercase tracking-wider">
              Street Network Safety:
            </span>
            <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 rounded-full bg-emerald-600 shrink-0" />
                <span>Low Risk (Safe Passable)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 rounded-full bg-amber-500 shrink-0" />
                <span>Moderate Waterlogging</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 rounded-full bg-orange-500 shrink-0" />
                <span>High Risk Street</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 rounded-full bg-red-600 shrink-0" />
                <span>Critical / Impassable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 rounded-full bg-red-800 border border-white border-dashed shrink-0" />
                <span>Closed to Traffic</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-5 rounded-full bg-blue-600 shrink-0" />
                <span>Recommended Safe Evacuation</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg overflow-hidden shrink-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center sm:justify-between h-9 w-9 sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors gap-1.5 sm:gap-2 shrink-0"
          aria-label="Toggle map legend"
          title="Flood Risk Legend"
        >
          <span className="flex items-center gap-1.5 sm:gap-2">
            <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="hidden sm:inline">Flood Risk Legend</span>
          </span>
          <span className="hidden sm:inline">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            )}
          </span>
        </button>

        {/* Mini Color Bar (always visible on sm+) */}
        <div className="hidden sm:flex h-1.5 sm:h-2 w-full">
          <div className="flex-1 bg-emerald-500" title="Low Risk (0-19)" />
          <div className="flex-1 bg-amber-500" title="Moderate Risk (20-39)" />
          <div className="flex-1 bg-orange-500" title="High Risk (40-69)" />
          <div className="flex-1 bg-red-600" title="Critical Risk (70-100)" />
        </div>
      </div>
    </div>
  );
}
