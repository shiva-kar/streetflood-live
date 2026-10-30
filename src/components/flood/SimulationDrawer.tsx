import { useState } from "react";
import {
  Sliders,
  X,
  CloudRain,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Info,
  Waves,
  Zap,
} from "lucide-react";
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

  if (!open) return null;

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
    toast.success("Sensor readings and predictive risk scores updated with latest telemetry!");
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
      "Simulated cloudburst surge triggered (+25mm rain)! Watch tiles transition to High/Critical.",
      {
        duration: 5000,
      },
    );
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sim-drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="sim-drawer-title"
                className="font-display font-bold text-base text-foreground"
              >
                Simulation Sandbox
              </h2>
              <p className="text-xs text-muted-foreground">
                Interactive weather, drainage & telemetry test controls
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close simulation drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Disclaimer Note */}
        <div className="p-3 bg-muted/50 border-b text-[11px] text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            Use these controls during judging to test how the predictive algorithm, map overlays,
            safe routing, and evacuation advisories dynamically react to changing conditions.
          </span>
        </div>

        {/* Controls Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Quick Scenario Triggers */}
          <div className="space-y-2">
            <label className="font-bold text-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Quick Weather Scenarios</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSurge}
                className="text-xs h-9 font-semibold border-amber-500/40 hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 gap-1.5"
              >
                <CloudRain className="h-3.5 w-3.5" />
                <span>Simulate Cloudburst</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  updateSim({ recentRainfall: 10, forecastRainfall: 15, drainageOffset: 15 });
                  toast.success("Receded rain scenario loaded.");
                }}
                className="text-xs h-9 font-semibold border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 gap-1.5"
              >
                <Waves className="h-3.5 w-3.5" />
                <span>Simulate Receding</span>
              </Button>
            </div>
          </div>

          {/* Slider 1: Recent Rainfall */}
          <div className="space-y-2 rounded-lg border border-border p-3 bg-background">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Recent Rainfall (Last Hour)</span>
              <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
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
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0 mm (Dry)</span>
              <span>20 mm (Moderate)</span>
              <span>50+ mm (Torrential)</span>
            </div>
          </div>

          {/* Slider 2: Forecast Rainfall (Next 3h) */}
          <div className="space-y-2 rounded-lg border border-border p-3 bg-background">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Forecast Rainfall (Next 3 Hours)
              </span>
              <Badge variant="outline" className="font-mono text-xs font-bold text-amber-600">
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
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0 mm (Clear)</span>
              <span>30 mm (Threshold)</span>
              <span>80+ mm (Severe Warning)</span>
            </div>
          </div>

          {/* Slider 3: Drainage Infrastructure Offset */}
          <div className="space-y-2 rounded-lg border border-border p-3 bg-background">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Drainage Capacity Modifier</span>
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
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>-40 (Clogged / High Tide)</span>
              <span>0 (Baseline)</span>
              <span>+40 (Pumps Active)</span>
            </div>
          </div>

          {/* Toggle Hotspot Logic */}
          <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-background cursor-pointer">
            <div>
              <div className="font-semibold text-foreground">Factor Known Low-Lying Hotspots</div>
              <div className="text-[10px] text-muted-foreground">
                Weights Sion Circle, Chunabhatti, and Mithi River corridors
              </div>
            </div>
            <input
              type="checkbox"
              checked={sim.useHotspots}
              onChange={(e) => updateSim({ useHotspots: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </label>

          {/* Telemetry Refresh */}
          <div className="space-y-2 pt-2 border-t">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleRefreshSensors}
              disabled={isRefreshing}
              className="w-full text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh Simulated Sensor Readings</span>
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Simulation Tick: #{sim.tick} • Last Telemetry Ping:{" "}
              {new Date(sim.lastSensorRefresh).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/40 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              resetDemo();
              toast.success("Demo state reset to initial seed values!");
            }}
            className="text-xs text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset State
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
