import { useState } from "react";
import {
  Bell,
  Navigation,
  LifeBuoy,
  Sliders,
  RotateCcw,
  UserCheck,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resetDemo } from "@/lib/flood/store";
import { toast } from "sonner";
import type { AppState, FloodAlert, Tile } from "@/lib/flood/types";

interface HeaderProps {
  mode: "resident" | "authority";
  onModeChange: (m: "resident" | "authority") => void;
  state: AppState;
  tiles: Tile[];
  alerts: FloodAlert[];
  onOpenAlerts: () => void;
  onOpenRoute: () => void;
  onOpenPreparedness: () => void;
  onOpenSimulation: () => void;
}

export default function Header({
  mode,
  onModeChange,
  state,
  tiles,
  alerts,
  onOpenAlerts,
  onOpenRoute,
  onOpenPreparedness,
  onOpenSimulation,
}: HeaderProps) {
  const [resetting, setResetting] = useState(false);

  const highCriticalCount = tiles.filter(
    (t) => t.currentRiskLevel === "High" || t.currentRiskLevel === "Critical",
  ).length;

  const handleReset = () => {
    setResetting(true);
    resetDemo();
    toast.success("Demo state reset to default scenario!");
    setTimeout(() => setResetting(false), 500);
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 z-30">
      {/* Brand & Area Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-sky-600 text-white font-extrabold text-sm tracking-tight shadow-sm shrink-0">
          SF
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
              StreetFlood<span className="text-sky-600 dark:text-sky-400">.Live</span>
            </h1>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
            >
              Mumbai • Sion–Kurla
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight hidden md:block truncate mt-0.5">
            Hyperlocal Street Flood Monitoring & Early Warning
          </p>
        </div>
      </div>

      {/* Role Switcher (Resident vs Authority Control Room) */}
      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 shadow-xs">
        <button
          type="button"
          onClick={() => onModeChange("resident")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-semibold transition-all ${
            mode === "resident"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <UserCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>Resident</span>
        </button>
        <button
          type="button"
          onClick={() => onModeChange("authority")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-semibold transition-all ${
            mode === "authority"
              ? "bg-sky-600 text-white shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">Control Room</span>
          <span className="sm:hidden">Admin</span>
        </button>
      </div>

      {/* Top Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Safe Route Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenRoute}
          className="h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Plan Safe Route avoiding flooded tiles"
        >
          <Navigation className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden md:inline">Safe Route</span>
        </Button>

        {/* Alerts Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAlerts}
          className="relative h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Targeted Municipal & Early Warning Alerts"
        >
          <Bell className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          <span className="hidden md:inline">Alerts</span>
          {alerts.length > 0 && (
            <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white shadow-xs">
              {alerts.length}
            </span>
          )}
        </Button>

        {/* Emergency Preparedness Button */}
        <Button
          variant={highCriticalCount > 0 ? "destructive" : "outline"}
          size="sm"
          onClick={onOpenPreparedness}
          className={`h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium gap-1.5 ${
            highCriticalCount > 0
              ? "bg-red-600 hover:bg-red-700 text-white font-bold animate-pulse"
              : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title="Emergency Shelters, Relief Helplines & Checklists"
        >
          <LifeBuoy className="h-4 w-4" />
          <span className="hidden sm:inline">Emergency</span>
        </Button>

        {/* Simulation Sandbox Settings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSimulation}
          className="h-9 w-9 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          title="Simulation Sandbox (Rainfall & Sensor testing)"
        >
          <Sliders className="h-4 w-4" />
        </Button>

        {/* Reset Demo State */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          disabled={resetting}
          className="h-9 w-9 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          title="Reset Demo to Initial Seed Data"
        >
          <RotateCcw className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </header>
  );
}
