import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, X, MapPin, Clock, ChevronRight, LifeBuoy } from "lucide-react";
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

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const publishedAlerts = alerts.filter((a) => a.status === "Published");
  const visibleAlerts = publishedAlerts.filter((a) =>
    a.tileIds.some((id) => viewportTileIds.has(id)),
  );
  const displayedAlerts = filter === "visible" ? visibleAlerts : publishedAlerts;

  const severityBadge = (sev: FloodAlert["severity"]) => {
    switch (sev) {
      case "Critical":
        return "bg-red-600 text-white font-bold";
      case "Warning":
        return "bg-amber-500 text-slate-900 font-bold";
      case "Info":
        return "bg-sky-600 text-white font-bold";
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alerts-drawer-title"
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
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="alerts-drawer-title"
                className="font-display font-bold text-lg text-slate-900 dark:text-slate-100"
              >
                Targeted Flood Alerts
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Municipal bulletins & predictive advisories
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close alerts"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              filter === "all"
                ? "bg-sky-600 text-white shadow-xs font-bold"
                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            All Alerts ({publishedAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("visible")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              filter === "visible"
                ? "bg-sky-600 text-white shadow-xs font-bold"
                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            Visible Area ({visibleAlerts.length})
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-sm">
          {displayedAlerts.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Bell className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-base">
                No active alerts
              </p>
              <p className="text-xs sm:text-sm max-w-xs mx-auto">
                {filter === "visible"
                  ? "Pan or zoom the map to view other areas, or switch to 'All Alerts'."
                  : "All clear! No municipal flood advisories published right now."}
              </p>
            </div>
          ) : (
            displayedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-4 space-y-2.5 shadow-sm hover:border-sky-500/50 transition-all"
              >
                {/* Meta Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-xs px-2.5 py-0.5 ${severityBadge(alert.severity)}`}>
                      {alert.severity}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold px-2 py-0.5 ${
                        alert.type === "Municipal"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                          : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300"
                      }`}
                    >
                      {alert.type === "Municipal"
                        ? "Verified – Municipal"
                        : "System – Predictive / Simulated"}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {timeAgo(alert.createdAt, Date.now())}
                  </span>
                </div>

                {/* Title & Body */}
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                    {alert.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {alert.message}
                  </p>
                </div>

                {/* Target Ward / Area */}
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="h-4 w-4 text-sky-600" />
                    <span>
                      {alert.wardLabel || "Targeted Area"} ({alert.tileIds.length} block
                      {alert.tileIds.length > 1 ? "s" : ""})
                    </span>
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onSelectAlertTiles(alert.tileIds);
                      onClose();
                    }}
                    className="h-8 px-2.5 text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-bold gap-1"
                  >
                    <span>Show on Map</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
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
                    className="w-full h-8 text-xs font-bold gap-1.5 mt-1 bg-red-600 hover:bg-red-700"
                  >
                    <LifeBuoy className="h-4 w-4" />
                    <span>View Emergency Contacts & Shelters</span>
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 text-center">
          Alerts are broadcast directly by municipal control teams and early-warning sensors.
        </div>
      </div>
    </div>,
    document.body,
  );
}
