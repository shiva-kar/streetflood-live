import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function MapLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute bottom-4 right-4 z-20 max-w-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg overflow-hidden text-xs transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 px-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors gap-2"
        aria-label="Toggle map legend"
      >
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-600 shadow-2xs" />
          <span>Flood Risk Legend</span>
        </span>
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {/* Mini Color Bar (always visible) */}
      <div className="flex h-2 w-full">
        <div className="flex-1 bg-emerald-500" title="Low Risk (0-19)" />
        <div className="flex-1 bg-amber-500" title="Moderate Risk (20-39)" />
        <div className="flex-1 bg-orange-500" title="High Risk (40-69)" />
        <div className="flex-1 bg-red-600" title="Critical Risk (70-100)" />
      </div>

      {expanded && (
        <div className="p-3.5 pt-2.5 space-y-3 border-t border-slate-200 dark:border-slate-800 text-xs bg-slate-50/50 dark:bg-slate-900/50">
          {/* Risk Level Tiers */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">
              100m² Tile Severity Tiers:
            </span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-xs bg-emerald-500 shadow-2xs shrink-0" />
                <span className="font-medium">Low (0–19)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-xs bg-amber-500 shadow-2xs shrink-0" />
                <span className="font-medium">Moderate (20–39)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-xs bg-orange-500 shadow-2xs shrink-0" />
                <span className="font-medium">High (40–69)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-xs bg-red-600 shadow-2xs shrink-0" />
                <span className="font-medium">Critical (70–100)</span>
              </div>
            </div>
          </div>

          {/* Map Symbols */}
          <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-2.5">
            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">
              Map Overlays:
            </span>
            <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs shrink-0" />
                <span>Verified Report (Municipal confirmed)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-white border-2 border-orange-500 shadow-xs shrink-0" />
                <span>Unverified Citizen Report</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm shrink-0">⛔ / 🚫</span>
                <span>Official Road Closure</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-xs bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs shrink-0">
                  ⌂
                </span>
                <span>Relief Shelter / Relief Center</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-xs border-2 border-dashed border-amber-500 shrink-0" />
                <span>3h Predicted Moderate Risk Outline</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
