import { useState } from "react";
import { Info, ChevronUp, ChevronDown } from "lucide-react";

export default function MapLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 z-20 max-w-xs rounded-lg border border-border bg-card/95 backdrop-blur-md shadow-lg overflow-hidden text-xs transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2 px-3 hover:bg-muted/50 text-[11px] font-bold text-foreground transition-colors gap-2"
        aria-label="Toggle map legend"
      >
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span>Map Risk Legend</span>
        </span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {/* Mini Color Bar (always visible) */}
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-emerald-500" title="Low Risk (0-19)" />
        <div className="flex-1 bg-amber-500" title="Moderate Risk (20-39)" />
        <div className="flex-1 bg-orange-500" title="High Risk (40-69)" />
        <div className="flex-1 bg-red-600" title="Critical Risk (70-100)" />
      </div>

      {expanded && (
        <div className="p-3 pt-2 space-y-2.5 border-t text-[11px] bg-background/50">
          {/* Risk Level Tiers */}
          <div className="space-y-1">
            <span className="font-semibold text-muted-foreground text-[10px] uppercase">
              Flood Severity Tiers (100m² Grid):
            </span>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-emerald-500 shrink-0" />
                <span>Low (0–19)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-amber-500 shrink-0" />
                <span>Moderate (20–39)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-orange-500 shrink-0" />
                <span>High (40–69)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-red-600 shrink-0" />
                <span>Critical (70–100)</span>
              </div>
            </div>
          </div>

          {/* Map Symbols */}
          <div className="space-y-1 border-t pt-2">
            <span className="font-semibold text-muted-foreground text-[10px] uppercase">
              Map Markers & Overlays:
            </span>
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-background shadow-xs shrink-0" />
                <span>Verified Report (Municipal confirmed)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-background border-2 border-orange-500 shadow-xs shrink-0" />
                <span>Unverified Crowd Report</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs shrink-0">⛔ / 🚫</span>
                <span>Road Closure / Blockade</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-xs bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                  ⌂
                </span>
                <span>Relief Shelter / Evacuation Centre</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-xs border-2 border-dashed border-amber-500 shrink-0" />
                <span>3h Predicted Moderate Risk Outline</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
