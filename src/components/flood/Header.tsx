import { useState } from "react";
import {
  Bell,
  Navigation,
  LifeBuoy,
  Sliders,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  Building2,
  CloudRain,
  Flame,
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
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md shadow-xs transition-colors">
      <div className="flex h-14 items-center justify-between px-3 md:px-5 gap-2">
        {/* Brand & City Tag */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground font-bold font-display shadow-xs shrink-0">
            SF
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base md:text-lg tracking-tight truncate text-foreground">
                StreetFlood<span className="text-primary font-extrabold">.Live</span>
              </span>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] px-1.5 py-0 font-medium bg-muted/60 text-muted-foreground border-border"
              >
                Mumbai • Sion-Kurla
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-none hidden sm:block truncate">
              Hyperlocal Street Flood Monitoring & Early Warning
            </p>
          </div>
        </div>

        {/* View Mode Toggle (Resident vs Authority) */}
        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => onModeChange("resident")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "resident"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            <span className="hidden xs:inline">Resident</span>
            <span className="xs:hidden">Res</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("authority")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "authority"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Control Room</span>
            <span className="xs:hidden">Admin</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Plan Safe Route */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenRoute}
            className="h-8 px-2 sm:px-2.5 text-xs font-medium gap-1.5 border-border hover:bg-accent"
            title="Plan Safe Route avoiding flooded tiles"
          >
            <Navigation className="h-3.5 w-3.5 text-route" />
            <span className="hidden md:inline">Safe Route</span>
          </Button>

          {/* Active Alerts */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAlerts}
            className="relative h-8 px-2 sm:px-2.5 text-xs font-medium gap-1.5 border-border hover:bg-accent"
            title="Targeted Alert Notifications"
          >
            <Bell className="h-3.5 w-3.5 text-foreground" />
            <span className="hidden md:inline">Alerts</span>
            {alerts.length > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {alerts.length}
              </span>
            )}
          </Button>

          {/* Emergency Preparedness & Shelters */}
          <Button
            variant={highCriticalCount > 0 ? "destructive" : "outline"}
            size="sm"
            onClick={onOpenPreparedness}
            className={`h-8 px-2 sm:px-2.5 text-xs font-medium gap-1.5 ${
              highCriticalCount > 0 ? "animate-pulse" : "border-border hover:bg-accent"
            }`}
            title="Emergency Preparedness, Shelters & Contacts"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Emergency</span>
          </Button>

          {/* Simulation Drawer Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSimulation}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Simulation Settings (Rainfall & Sensor sandbox)"
          >
            <Sliders className="h-4 w-4" />
          </Button>

          {/* Reset Demo Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            disabled={resetting}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Reset Demo to Initial Seeded State"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </header>
  );
}
