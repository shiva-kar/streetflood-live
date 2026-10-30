import { useState } from "react";
import {
  Bell,
  X,
  AlertTriangle,
  Info,
  ShieldAlert,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/flood/engine";
import type { FloodAlert, Tile } from "@/lib/flood/types";

interface AlertsDrawerProps {
  open: boolean;
  alerts: FloodAlert[];
  tiles: Tile[];
  viewportTileIds: Set<string>;
  onClose: () => void;
  onSelectAlertTiles: (tileIds: string[]) => void;
  onOpenPreparedness: () => void;
}

export default function AlertsDrawer({
  open,
  alerts,
  tiles,
  viewportTileIds,
  onClose,
  onSelectAlertTiles,
  onOpenPreparedness,
}: AlertsDrawerProps) {
  const [filter, setFilter] = useState<"all" | "visible">("all");

  if (!open) return null;

  const publishedAlerts = alerts.filter((a) => a.status === "Published");

  const visibleAlerts = publishedAlerts.filter((a) =>
    a.tileIds.some((id) => viewportTileIds.has(id)),
  );

  const displayedAlerts = filter === "visible" ? visibleAlerts : publishedAlerts;

  const severityBadge = (sev: FloodAlert["severity"]) => {
    switch (sev) {
      case "Critical":
        return "bg-red-500/20 text-red-900 dark:text-red-300 border-red-500/40";
      case "Warning":
        return "bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-500/40";
      case "Info":
        return "bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-500/40";
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alerts-drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="alerts-drawer-title"
                className="font-display font-bold text-base text-foreground"
              >
                Targeted Flood Alerts
              </h2>
              <p className="text-xs text-muted-foreground">
                Official municipal bulletins & automated predictive warnings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close alerts"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="p-3 border-b flex items-center gap-2 bg-muted/20">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All Alerts ({publishedAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("visible")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filter === "visible"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Visible Area ({visibleAlerts.length})
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {displayedAlerts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="font-medium text-foreground">No active alerts</p>
              <p className="text-xs">
                {filter === "visible"
                  ? "Pan or zoom the map to view other areas, or switch to 'All Alerts'."
                  : "All clear! No municipal flood advisories published right now."}
              </p>
            </div>
          ) : (
            displayedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-border bg-background p-3.5 space-y-2.5 shadow-2xs hover:border-primary/50 transition-all"
              >
                {/* Meta Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0 border ${severityBadge(alert.severity)}`}
                    >
                      {alert.severity}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0 border ${
                        alert.type === "Municipal"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30"
                      }`}
                    >
                      {alert.type === "Municipal"
                        ? "Verified – Municipal"
                        : "System – Predictive / Simulated"}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(alert.createdAt, Date.now())}
                  </span>
                </div>

                {/* Title & Body */}
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-sm text-foreground">{alert.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
                </div>

                {/* Target Ward / Area */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span>
                      {alert.wardLabel || "Targeted Area"} ({alert.tileIds.length} block
                      {alert.tileIds.length > 1 ? "s" : ""})
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onSelectAlertTiles(alert.tileIds);
                        onClose();
                      }}
                      className="h-7 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10 gap-1 font-semibold"
                    >
                      <span>Show on Map</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Quick shortcut to preparedness if Critical */}
                {alert.severity === "Critical" && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onOpenPreparedness();
                      onClose();
                    }}
                    className="w-full h-7 text-xs font-semibold gap-1 mt-1"
                  >
                    <span>View Emergency Contacts & Shelters</span>
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/40 text-[10px] text-muted-foreground text-center">
          Alerts are prioritized by severity and updated in real-time by municipal control teams.
        </div>
      </div>
    </div>
  );
}
