import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Send,
  Plus,
  Trash2,
  Clock,
  Camera,
  MapPin,
  Sliders,
  CloudRain,
  Eye,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { setState, uid } from "@/lib/flood/store";
import { timeAgo } from "@/lib/flood/engine";
import { ZONES } from "@/lib/flood/data";
import { toast } from "sonner";
import type {
  AlertSeverity,
  AppState,
  FloodAlert,
  FloodReport,
  IncidentStatus,
  ReportStatus,
  RoadIncident,
  Tile,
} from "@/lib/flood/types";

interface AuthorityDashboardProps {
  state: AppState;
  tiles: Tile[];
  onFocusTile: (tileId: string) => void;
  onOpenSimulation: () => void;
}

export default function AuthorityDashboard({
  state,
  tiles,
  onFocusTile,
  onOpenSimulation,
}: AuthorityDashboardProps) {
  const [activeTab, setActiveTab] = useState<"reports" | "closures" | "alerts" | "overview">(
    "reports",
  );
  const [reportFilter, setReportFilter] = useState<ReportStatus | "All">("Unverified");

  // New Road Incident Form State
  const [incidentTileId, setIncidentTileId] = useState(tiles[0]?.id || "t_20_16");
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus>("ClosedAllTraffic");
  const [incidentDesc, setIncidentDesc] = useState("");

  // New Alert Form State
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>("Warning");
  const [alertTargetWard, setAlertTargetWard] = useState<string>("kurla-w");

  // Selected Photo Modal
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // KPIs
  const unverifiedReports = state.reports.filter((r) => r.status === "Unverified");
  const verifiedReports = state.reports.filter((r) => r.status === "Verified");
  const dismissedReports = state.reports.filter((r) => r.status === "Dismissed");
  const activeClosures = state.incidents.length;
  const criticalTiles = tiles.filter((t) => t.currentRiskLevel === "Critical").length;
  const highTiles = tiles.filter((t) => t.currentRiskLevel === "High").length;

  // Actions
  const handleVerifyReport = (id: string) => {
    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) =>
        r.id === id ? { ...r, status: "Verified", reviewedAt: new Date().toISOString() } : r,
      ),
    }));
    toast.success("Report verified! Tile severity score updated with 20x official weighting.");
  };

  const handleDismissReport = (id: string) => {
    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) =>
        r.id === id ? { ...r, status: "Dismissed", reviewedAt: new Date().toISOString() } : r,
      ),
    }));
    toast.info("Report dismissed as not flood-related. Tile severity recalculated.");
  };

  const handleAddIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDesc.trim()) {
      toast.error("Please enter a description for the road closure.");
      return;
    }

    const newInc: RoadIncident = {
      id: uid("inc"),
      tileId: incidentTileId,
      status: incidentStatus,
      description: incidentDesc.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Authority",
    };

    setState((prev) => ({
      ...prev,
      incidents: [newInc, ...prev.incidents.filter((i) => i.tileId !== incidentTileId)],
    }));

    toast.success("Road closure logged and published! Displaying on all resident maps.");
    setIncidentDesc("");
  };

  const handleRemoveIncident = (id: string) => {
    setState((prev) => ({
      ...prev,
      incidents: prev.incidents.filter((i) => i.id !== id),
    }));
    toast.success("Road closure resolved. Road reopened on live map.");
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) {
      toast.error("Please fill in both alert title and message body.");
      return;
    }

    // Target tiles in the selected ward
    const targetTiles = tiles.filter((t) => t.ward === alertTargetWard);
    const wardName = ZONES.find((z) => z.key === alertTargetWard)?.label || alertTargetWard;

    const newAlert: FloodAlert = {
      id: uid("alert"),
      title: alertTitle.trim(),
      message: alertMessage.trim(),
      severity: alertSeverity,
      type: "Municipal",
      status: "Published",
      tileIds: targetTiles.map((t) => t.id),
      wardLabel: wardName,
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      alerts: [newAlert, ...prev.alerts],
    }));

    toast.success(
      `Targeted municipal alert published to ${wardName} (${targetTiles.length} tiles)!`,
    );
    setAlertTitle("");
    setAlertMessage("");
  };

  const handleArchiveAlert = (id: string) => {
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === id ? { ...a, status: "Archived" } : a)),
    }));
    toast.info("Alert archived from resident feed.");
  };

  // Filtered reports
  const displayedReports = state.reports.filter((r) => {
    if (reportFilter === "All") return true;
    return r.status === reportFilter;
  });

  return (
    <div className="absolute top-16 left-3 right-3 sm:left-auto sm:right-5 sm:w-[540px] max-h-[85vh] z-30 flex flex-col rounded-xl border border-border bg-card/98 backdrop-blur-md shadow-2xl overflow-hidden transition-all animate-in slide-in-from-top-3 duration-200">
      {/* Top Header */}
      <div className="p-3.5 border-b bg-muted/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground font-bold">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
              <span>Municipal Control Room</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30"
              >
                Live Admin Mode
              </Badge>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              MCGM / Disaster Management Cell • Command & Verification Console
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-muted/30 border-b text-center font-mono text-xs">
        <div className="p-1.5 rounded bg-background border border-border">
          <div className="text-[10px] font-sans text-muted-foreground">Pending Reports</div>
          <div className="font-bold text-amber-600 text-sm">{unverifiedReports.length}</div>
        </div>
        <div className="p-1.5 rounded bg-background border border-border">
          <div className="text-[10px] font-sans text-muted-foreground">Road Closures</div>
          <div className="font-bold text-destructive text-sm">{activeClosures}</div>
        </div>
        <div className="p-1.5 rounded bg-background border border-border">
          <div className="text-[10px] font-sans text-muted-foreground">Critical Tiles</div>
          <div className="font-bold text-red-600 text-sm">{criticalTiles}</div>
        </div>
        <div className="p-1.5 rounded bg-background border border-border">
          <div className="text-[10px] font-sans text-muted-foreground">Rain Telemetry</div>
          <div className="font-bold text-foreground text-sm">{state.sim.recentRainfall} mm/h</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b bg-muted/20 px-2">
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "reports"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Reports Queue</span>
          {unverifiedReports.length > 0 && (
            <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
              {unverifiedReports.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("closures")}
          className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "closures"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Road Closures ({activeClosures})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("alerts")}
          className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "alerts"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Broadcast Alerts
        </button>
        <button
          type="button"
          onClick={onOpenSimulation}
          className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border-b-2 border-transparent flex items-center gap-1"
          title="Open Simulation Telemetry Sandbox"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Sim</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-3.5 text-xs">
        {/* TAB 1: REPORTS QUEUE */}
        {activeTab === "reports" && (
          <div className="space-y-3">
            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                {(["Unverified", "Verified", "Dismissed", "All"] as const).map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setReportFilter(st)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      reportFilter === st
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "Unverified" ? `Pending (${unverifiedReports.length})` : st}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                Showing {displayedReports.length} report(s)
              </span>
            </div>

            {/* List */}
            {displayedReports.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground italic">
                No reports found under "{reportFilter}" status.
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedReports.map((r) => {
                  const tile = tiles.find((t) => t.id === r.tileId);
                  return (
                    <div
                      key={r.id}
                      className="p-3 rounded-lg border border-border bg-background space-y-2 shadow-2xs hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground">
                              {tile?.locality || r.tileId}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 ${
                                r.status === "Verified"
                                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                                  : r.status === "Dismissed"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {r.status}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Submitted {timeAgo(r.createdAt, Date.now())}</span>
                            <span>
                              • Reported Depth: <strong>{r.severityUser}</strong>
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onFocusTile(r.tileId)}
                          className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10 gap-1 shrink-0"
                        >
                          <MapPin className="h-3 w-3" />
                          <span>Locate</span>
                        </Button>
                      </div>

                      <p className="text-[11px] text-foreground leading-snug">{r.description}</p>

                      {/* Photo Thumbnail */}
                      {r.photoUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(r.photoUrl!)}
                            className="relative h-14 w-20 rounded-md overflow-hidden border border-border hover:opacity-90 transition-opacity bg-black/5 shrink-0"
                          >
                            <img
                              src={r.photoUrl}
                              alt="Report evidence"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity text-white text-[9px] font-semibold">
                              Zoom
                            </div>
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            Citizen attached photo evidence (click to inspect full resolution)
                          </span>
                        </div>
                      )}

                      {/* Verification Actions */}
                      <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-border/60">
                        {r.status !== "Dismissed" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDismissReport(r.id)}
                            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Dismiss</span>
                          </Button>
                        )}
                        {r.status !== "Verified" && (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => handleVerifyReport(r.id)}
                            className="h-7 px-2.5 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Verify (Official)</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ROAD CLOSURES & INCIDENTS */}
        {activeTab === "closures" && (
          <div className="space-y-4">
            {/* Log New Incident Form */}
            <form
              onSubmit={handleAddIncident}
              className="p-3 rounded-lg border border-border bg-background space-y-2.5"
            >
              <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <span>Mark Road Closure / Hazard</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Target Tile / Road Block
                  </label>
                  <select
                    value={incidentTileId}
                    onChange={(e) => setIncidentTileId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-1.5 text-xs font-medium"
                  >
                    {tiles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.locality} ({t.ward.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Restriction Status
                  </label>
                  <select
                    value={incidentStatus}
                    onChange={(e) => setIncidentStatus(e.target.value as IncidentStatus)}
                    className="w-full rounded-md border border-input bg-background p-1.5 text-xs font-medium"
                  >
                    <option value="ClosedAllTraffic">⛔ Closed to All Traffic</option>
                    <option value="ClosedSmallVehicles">🚫 Closed to Small Vehicles</option>
                    <option value="PartiallyFlooded">⚠️ Partially Flooded (Slow)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">
                  Official Advisory Description
                </label>
                <Input
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="e.g. Subway closed due to 3ft waterlogging. Traffic diverted via SCLR."
                  className="text-xs h-8"
                  required
                />
              </div>

              <Button type="submit" size="sm" className="w-full text-xs font-semibold gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>Publish Road Closure to Map</span>
              </Button>
            </form>

            {/* Current Active Closures List */}
            <div className="space-y-2">
              <span className="font-semibold text-foreground text-[11px]">
                Active Road Incidents ({state.incidents.length})
              </span>

              {state.incidents.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground italic border rounded-lg">
                  No active road closures logged.
                </div>
              ) : (
                state.incidents.map((inc) => {
                  const tile = tiles.find((t) => t.id === inc.tileId);
                  return (
                    <div
                      key={inc.id}
                      className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/5 space-y-1.5 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">
                            {tile?.locality || inc.tileId}
                          </span>
                          <Badge variant="destructive" className="text-[9px] px-1 py-0">
                            {inc.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{inc.description}</p>
                        <div className="text-[9px] text-muted-foreground">
                          Updated {timeAgo(inc.updatedAt, Date.now())}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onFocusTile(inc.tileId)}
                          className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                          title="Locate on map"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveIncident(inc.id)}
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                          title="Reopen road"
                        >
                          Reopen
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BROADCAST ALERTS */}
        {activeTab === "alerts" && (
          <div className="space-y-4">
            {/* Publish Alert Form */}
            <form
              onSubmit={handleCreateAlert}
              className="p-3 rounded-lg border border-border bg-background space-y-2.5"
            >
              <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Send className="h-4 w-4 text-primary" />
                <span>Publish Official Municipal Advisory</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Target Ward / Sub-Area
                  </label>
                  <select
                    value={alertTargetWard}
                    onChange={(e) => setAlertTargetWard(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-1.5 text-xs font-medium"
                  >
                    {ZONES.map((z) => (
                      <option key={z.key} value={z.key}>
                        {z.label} Ward
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Severity Level
                  </label>
                  <select
                    value={alertSeverity}
                    onChange={(e) => setAlertSeverity(e.target.value as AlertSeverity)}
                    className="w-full rounded-md border border-input bg-background p-1.5 text-xs font-medium"
                  >
                    <option value="Info">Info (Advisory)</option>
                    <option value="Warning">Warning (Significant Waterlogging)</option>
                    <option value="Critical">Critical (Immediate Danger / Evacuation)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">
                  Alert Headline
                </label>
                <Input
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder="e.g. Waterlogging Warning – Kurla Subway & LBS Marg"
                  className="text-xs h-8"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">
                  Detailed Advisory Message
                </label>
                <Textarea
                  rows={2}
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="e.g. Submerged road conditions. Commuters advised to take Eastern Express Highway. Emergency shelter opened at Municipal School."
                  className="text-xs resize-none"
                  required
                />
              </div>

              <Button type="submit" size="sm" className="w-full text-xs font-semibold gap-1.5">
                <Send className="h-3.5 w-3.5" />
                <span>Broadcast Alert to Residents</span>
              </Button>
            </form>

            {/* Published Alerts */}
            <div className="space-y-2">
              <span className="font-semibold text-foreground text-[11px]">
                Currently Published Alerts (
                {state.alerts.filter((a) => a.status === "Published").length})
              </span>

              {state.alerts
                .filter((a) => a.status === "Published")
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2.5 rounded-lg border border-border bg-background space-y-1.5 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground truncate">{alert.title}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {alert.severity}
                        </Badge>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {alert.message}
                      </p>
                      <div className="text-[9px] text-muted-foreground">
                        Target: {alert.wardLabel || "Corridor"} • Published{" "}
                        {timeAgo(alert.createdAt, Date.now())}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveAlert(alert.id)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Archive
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo Zoom Modal */}
      {previewPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-lg max-h-[80vh] overflow-hidden rounded-lg bg-background shadow-2xl">
            <img
              src={previewPhoto}
              alt="Evidence Full View"
              className="max-h-[75vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
