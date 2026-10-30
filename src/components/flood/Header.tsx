import { useState } from "react";
import {
  Bell,
  Navigation,
  LifeBuoy,
  Sliders,
  RotateCcw,
  UserCheck,
  Building2,
  Menu,
  X,
  PlusCircle,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resetDemo } from "@/lib/flood/store";
import { toast } from "sonner";
import type { AppState, FloodAlert, Tile } from "@/lib/flood/types";
import { ZONES } from "@/lib/flood/data";

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
  onOpenReport?: () => void;
  onSelectZone?: (zoneKey: string) => void;
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
  onOpenReport,
  onSelectZone,
}: HeaderProps) {
  const [resetting, setResetting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const highCriticalCount = tiles.filter(
    (t) => t.currentRiskLevel === "High" || t.currentRiskLevel === "Critical",
  ).length;

  const handleReset = () => {
    setResetting(true);
    resetDemo();
    toast.success("Demo state reset to default scenario!");
    setMobileMenuOpen(false);
    setTimeout(() => setResetting(false), 500);
  };

  return (
    <>
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-30">
        {/* Brand & Area Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-sky-600 text-white font-extrabold text-xs sm:text-sm tracking-tight shadow-sm shrink-0">
            SF
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-display font-extrabold text-sm sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
                StreetFlood<span className="text-sky-600 dark:text-sky-400">.Live</span>
              </h1>
              <Badge
                variant="outline"
                className="hidden lg:inline-flex text-[11px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              >
                Mumbai • Sion–Kurla
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight hidden lg:block truncate mt-0.5">
              Hyperlocal Street Flood Monitoring & Early Warning
            </p>
          </div>
        </div>

        {/* Desktop Role Switcher (Hidden on Mobile) */}
        <div className="hidden md:flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 shadow-xs">
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
            <span>Control Room</span>
          </button>
        </div>

        {/* Desktop Action Buttons (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Safe Route Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenRoute}
            className="h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Plan Safe Route avoiding flooded streets"
          >
            <Navigation className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Safe Route</span>
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
            <span>Alerts</span>
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
            <span>Emergency</span>
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

        {/* Mobile Header Controls (< md screens) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Alerts Bell (Compact) */}
          <button
            type="button"
            onClick={onOpenAlerts}
            className="relative p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
            aria-label="Targeted alerts"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                {alerts.length}
              </span>
            )}
          </button>

          {/* Emergency Helplines Pill */}
          <button
            type="button"
            onClick={onOpenPreparedness}
            className={`p-2 rounded-lg font-bold text-xs ${
              highCriticalCount > 0
                ? "bg-red-600 text-white animate-pulse"
                : "bg-red-50 dark:bg-red-950 text-red-600 border border-red-200 dark:border-red-800"
            }`}
            title="Emergency Helplines & Shelters"
            aria-label="Emergency help"
          >
            <LifeBuoy className="h-4 w-4" />
          </button>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-xs flex items-center justify-center"
            aria-label="Open mobile menu"
          >
            <Menu className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* MOBILE NAVIGATION DRAWER & BACKDROP */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10000] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <div className="w-full max-w-xs h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-sky-600 text-white font-extrabold text-xs">
                  SF
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    StreetFlood<span className="text-sky-600">.Live</span>
                  </h2>
                  <p className="text-[10px] text-slate-500">Mumbai • Sion–Kurla</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Close mobile menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm no-scrollbar">
              {/* Mode Switcher */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Interface Mode
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      onModeChange("resident");
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      mode === "resident"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <UserCheck className="h-4 w-4 text-sky-600" />
                    <span>Resident</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onModeChange("authority");
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      mode === "authority"
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Control Room</span>
                  </button>
                </div>
              </div>

              {/* Main Actions List */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Navigation
                </span>

                {/* Safe Evacuation Route */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRoute();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                      <Navigation className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-xs">Safe Evacuation Route</div>
                      <div className="text-[10px] text-slate-500">OSM street network routing</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-600">
                    Roads
                  </Badge>
                </button>

                {/* Targeted Alerts */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAlerts();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-xs">Targeted Flood Alerts</div>
                      <div className="text-[10px] text-slate-500">Official warnings & forecasts</div>
                    </div>
                  </div>
                  {alerts.length > 0 && (
                    <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-red-600 text-white font-bold text-[10px]">
                      {alerts.length}
                    </span>
                  )}
                </button>

                {/* Emergency Guidance & Shelters */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenPreparedness();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600">
                      <LifeBuoy className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-xs">Emergency Shelters & Aid</div>
                      <div className="text-[10px] text-slate-500">Helplines & relief checklist</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-red-600">Dial 112</span>
                </button>

                {/* Report Flooding */}
                {onOpenReport && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenReport();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600">
                        <PlusCircle className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-xs">Report Flood Inundation</div>
                        <div className="text-[10px] text-slate-500">Submit water depth & photo</div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Simulation Sandbox */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSimulation();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      <Sliders className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-xs">Simulation Sandbox</div>
                      <div className="text-[10px] text-slate-500">Rainfall & sensor controls</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Quick Jump Wards */}
              {onSelectZone && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Jump to Ward Corridor
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ZONES.map((z) => (
                      <button
                        type="button"
                        key={z.key}
                        onClick={() => {
                          onSelectZone(z.key);
                          setMobileMenuOpen(false);
                        }}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-left truncate text-slate-800 dark:text-slate-200"
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset Demo Scenario */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={resetting}
                  className="w-full justify-center gap-2 text-xs border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <RotateCcw className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`} />
                  <span>Reset Demo Scenario</span>
                </Button>
              </div>
            </div>

            {/* Drawer Footer Emergency Callout */}
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border-t border-red-100 dark:border-red-900/50 flex items-center justify-between text-xs text-red-900 dark:text-red-300">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-red-600 shrink-0" />
                <span className="font-semibold text-[11px]">Emergency Hotline:</span>
              </div>
              <a
                href="tel:112"
                className="px-2.5 py-1 rounded-md bg-red-600 text-white font-extrabold text-xs shadow-xs"
              >
                Call 112
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
