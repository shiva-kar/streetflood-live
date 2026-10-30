import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sliders, X, CloudRain, RefreshCw, RotateCcw, Info, Waves, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setState, resetDemo } from "@/lib/flood/store";
import { toast } from "sonner";
import type { AppState } from "@/lib/flood/types";

interface SimulationDrawerProps {
  open: boolean;
  state: AppState;
  onClose: () => void;
}

export default function SimulationDrawer({ open, state, onClose }: SimulationDrawerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const { sim } = state;

  const updateSim = (partial: Partial<AppState["sim"]>) => {
    setState((prev) => ({
      ...prev,
      sim: {
        ...prev.sim,
        ...partial,
      },
    }));
  };

  const handleRefreshSensors = () => {
    setIsRefreshing(true);
    setState((prev) => ({
      ...prev,
      sim: {
        ...prev.sim,
        tick: prev.sim.tick + 1,
        lastSensorRefresh: new Date().toISOString(),
      },
    }));
    toast.success("Sensor telemetry and predictive risk scores updated!");
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSurge = () => {
    setIsRefreshing(true);
    setState((prev) => ({
      ...prev,
      sim: {
        ...prev.sim,
        recentRainfall: Math.min(100, prev.sim.recentRainfall + 25),
        forecastRainfall: Math.min(120, prev.sim.forecastRainfall + 30),
        tick: prev.sim.tick + 1,
        lastSensorRefresh: new Date().toISOString(),
      },
    }));
    toast.warning(
      "Simulated cloudburst surge triggered (+25mm rain)! Watch tiles transition on live map.",
      {
        duration: 5000,
      },
    );
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sim-drawer-title"
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-end z-[9990] animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="h-full w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-[10000] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-bold">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="sim-drawer-title"
                className="font-display font-bold text-lg text-slate-900 dark:text-slate-100"
              >
                Simulation Sandbox
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Weather, drainage & sensor testing controls
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close simulation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Callout */}
        <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 border-b border-sky-100 dark:border-sky-900/60 text-xs sm:text-sm text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          <span>
            Adjust rainfall and drainage sliders to test how the predictive algorithm, map grid,
            safe routing, and evacuation advisories react in real-time.
          </span>
        </div>

        {/* Sliders & Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-sm">
          {/* Quick Scenario Triggers */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Weather Scenarios</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSurge}
                className="h-10 text-xs sm:text-sm font-bold border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 gap-1.5"
              >
                <CloudRain className="h-4 w-4" />
                <span>Cloudburst Surge</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  updateSim({ recentRainfall: 10, forecastRainfall: 15, drainageOffset: 15 });
                  toast.success("Receded rainfall scenario applied.");
                }}
                className="h-10 text-xs sm:text-sm font-bold border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 gap-1.5"
              >
                <Waves className="h-4 w-4" />
                <span>Receding Flood</span>
              </Button>
            </div>
          </div>

          {/* Slider 1: Recent Rainfall */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Recent Rainfall (Last Hour)
              </span>
              <Badge className="font-mono text-xs font-bold bg-sky-600 text-white">
                {sim.recentRainfall} mm/h
              </Badge>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={sim.recentRainfall}
              onChange={(e) => updateSim({ recentRainfall: Number(e.target.value) })}
              className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0 mm (Dry)</span>
              <span>20 mm (Moderate)</span>
              <span>50+ mm (Torrential)</span>
            </div>
          </div>

          {/* Slider 2: Forecast Rainfall */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Forecast Rainfall (Next 3h)
              </span>
              <Badge className="font-mono text-xs font-bold bg-amber-500 text-slate-900">
                {sim.forecastRainfall} mm / 3h
              </Badge>
            </div>
            <input
              type="range"
              min={0}
              max={120}
              step={1}
              value={sim.forecastRainfall}
              onChange={(e) => updateSim({ forecastRainfall: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0 mm (Clear)</span>
              <span>30 mm (Threshold)</span>
              <span>80+ mm (Severe Alert)</span>
            </div>
          </div>

          {/* Slider 3: Drainage Capacity Modifier */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Drainage Capacity Modifier
              </span>
              <Badge variant="outline" className="font-mono text-xs font-bold">
                {sim.drainageOffset >= 0 ? `+${sim.drainageOffset}` : sim.drainageOffset} pts
              </Badge>
            </div>
            <input
              type="range"
              min={-40}
              max={40}
              step={5}
              value={sim.drainageOffset}
              onChange={(e) => updateSim({ drainageOffset: Number(e.target.value) })}
              className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>-40 (High Tide / Clogged)</span>
              <span>0 (Baseline)</span>
              <span>+40 (Pumps Active)</span>
            </div>
          </div>

          {/* Toggle Hotspot Rule */}
          <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Factor Known Low-Lying Hotspots
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Applies risk weighting to Sion Circle, Chunabhatti & Mithi corridors
              </div>
            </div>
            <input
              type="checkbox"
              checked={sim.useHotspots}
              onChange={(e) => updateSim({ useHotspots: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
          </label>

          {/* Refresh Sensor Telemetry */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              onClick={handleRefreshSensors}
              disabled={isRefreshing}
              className="w-full h-10 font-bold text-sm gap-2 bg-sky-600 hover:bg-sky-700 text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh Simulated Sensor Readings</span>
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Simulation Tick: #{sim.tick} • Telemetry Ping:{" "}
              {new Date(sim.lastSensorRefresh).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              resetDemo();
              toast.success("Demo state reset to initial seed values!");
            }}
            className="text-xs sm:text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset State
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 dark:border-slate-700"
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
