import {
  X,
  MapPin,
  ShieldAlert,
  CloudRain,
  Navigation,
  Plus,
  LifeBuoy,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZONES } from "@/lib/flood/data";
import type { AppState, FloodAlert, Tile } from "@/lib/flood/types";

interface CorridorOverviewProps {
  tiles: Tile[];
  state: AppState;
  alerts: FloodAlert[];
  onSelectZone: (zoneKey: string) => void;
  onOpenReport: () => void;
  onOpenRoute: () => void;
  onOpenPreparedness: () => void;
  onClose?: () => void;
}

export default function CorridorOverview({
  tiles,
  state,
  alerts,
  onSelectZone,
  onOpenReport,
  onOpenRoute,
  onOpenPreparedness,
  onClose,
}: CorridorOverviewProps) {
  const criticalCount = tiles.filter((t) => t.currentRiskLevel === "Critical").length;
  const highCount = tiles.filter((t) => t.currentRiskLevel === "High").length;
  const activeClosures = state.incidents.length;
  const publishedAlerts = alerts.filter((a) => a.status === "Published");

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Overview Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-600 text-white font-bold text-xs px-2.5 py-0.5">
                Live Monitoring
              </Badge>
              <span className="text-xs text-slate-500 font-medium">MCGM Corridor Zone</span>
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-slate-100 mt-1">
              Sion–Kurla Flood Corridor
            </h2>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Select any 100m² tile on the map to inspect street flood severity and 3h predictions.
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30">
            <div className="flex items-center justify-between text-xs font-bold text-red-700 dark:text-red-300">
              <span>Severe Blocks</span>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="font-display font-extrabold text-2xl text-red-600 dark:text-red-400 mt-1">
              {criticalCount + highCount}
            </div>
            <div className="text-[11px] text-red-600/80 font-medium mt-0.5">
              {criticalCount} Critical • {highCount} High
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Road Closures</span>
              <span className="text-sm">⛔</span>
            </div>
            <div className="font-display font-extrabold text-2xl text-slate-900 dark:text-slate-100 mt-1">
              {activeClosures}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Active traffic blockades
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Rainfall Telemetry</span>
              <CloudRain className="h-4 w-4 text-sky-500" />
            </div>
            <div className="font-display font-extrabold text-2xl text-slate-900 dark:text-slate-100 mt-1">
              {state.sim.recentRainfall} <span className="text-xs font-normal">mm/h</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              3h Forecast: {state.sim.forecastRainfall} mm
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Active Advisories</span>
              <Badge className="bg-sky-600 text-white text-[10px] px-1.5 py-0">
                {publishedAlerts.length}
              </Badge>
            </div>
            <div className="font-display font-extrabold text-2xl text-slate-900 dark:text-slate-100 mt-1">
              {publishedAlerts.length}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Municipal & Early Warnings
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2 pt-1">
          <Button
            type="button"
            onClick={onOpenReport}
            className="w-full h-11 font-bold text-sm gap-2 bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
            <span>Report Flooding Near You</span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onOpenRoute}
              className="h-10 text-xs sm:text-sm font-semibold gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Navigation className="h-4 w-4 text-indigo-600" />
              <span>Safe Route</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onOpenPreparedness}
              className="h-10 text-xs sm:text-sm font-semibold gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <LifeBuoy className="h-4 w-4 text-red-600" />
              <span>Shelters & Aid</span>
            </Button>
          </div>
        </div>

        {/* Sub-Ward Flood Status List */}
        <div className="space-y-2 pt-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Ward Corridor Zones (Click to Jump):
          </span>
          <div className="space-y-2">
            {ZONES.map((z) => {
              const zoneTiles = tiles.filter((t) => t.ward === z.key);
              const maxRisk = zoneTiles.some((t) => t.currentRiskLevel === "Critical")
                ? "Critical"
                : zoneTiles.some((t) => t.currentRiskLevel === "High")
                  ? "High"
                  : zoneTiles.some((t) => t.currentRiskLevel === "Moderate")
                    ? "Moderate"
                    : "Low";

              const badgeColor =
                maxRisk === "Critical"
                  ? "bg-red-600 text-white"
                  : maxRisk === "High"
                    ? "bg-orange-600 text-white"
                    : maxRisk === "Moderate"
                      ? "bg-amber-500 text-slate-900"
                      : "bg-emerald-600 text-white";

              return (
                <button
                  type="button"
                  key={z.key}
                  onClick={() => onSelectZone(z.key)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-left transition-all shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-sky-600 shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {z.label} Ward
                      </div>
                      <div className="text-xs text-slate-500">
                        {zoneTiles.length} surveyed blocks (100m²)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs px-2.5 py-0.5 font-bold ${badgeColor}`}>
                      {maxRisk}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tip Box */}
        <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 text-xs sm:text-sm text-sky-950 dark:text-sky-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          <span>
            <strong>Did you know?</strong> StreetFlood Live updates severity scores in real-time as
            citizens submit reports and official municipal teams verify field incidents.
          </span>
        </div>
      </div>
    </div>
  );
}
