import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Send,
  Plus,
  Clock,
  MapPin,
  Sliders,
  X,
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
  onClose?: () => void;
}

export default function AuthorityDashboard({
  state,
  tiles,
  onFocusTile,
  onOpenSimulation,
  onClose,
}: AuthorityDashboardProps) {
  const [activeTab, setActiveTab] = useState<"reports" | "closures" | "alerts">("reports");
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

  // Photo Zoom
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // KPIs
  const unverifiedReports = state.reports.filter((r) => r.status === "Unverified");
  const activeClosures = state.incidents.length;
  const criticalTiles = tiles.filter((t) => t.currentRiskLevel === "Critical").length;

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

  const displayedReports = state.reports.filter((r) => {
    if (reportFilter === "All") return true;
    return r.status === reportFilter;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Control Room Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-sky-600 text-white font-bold">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Municipal Control Room</span>
              <Badge className="text-xs px-2 py-0.5 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-300">
                Official Console
              </Badge>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Disaster Management & Field Verification
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close authority panel"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-4 gap-1.5 p-3 bg-slate-100 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-center font-mono text-xs shrink-0">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="text-[10px] font-sans text-slate-500 font-semibold">Pending</div>
          <div className="font-bold text-amber-600 text-base">{unverifiedReports.length}</div>
        </div>
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="text-[10px] font-sans text-slate-500 font-semibold">Closures</div>
          <div className="font-bold text-red-600 text-base">{activeClosures}</div>
        </div>
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="text-[10px] font-sans text-slate-500 font-semibold">Critical</div>
          <div className="font-bold text-red-600 text-base">{criticalTiles}</div>
        </div>
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="text-[10px] font-sans text-slate-500 font-semibold">Rain Telemetry</div>
          <div className="font-bold text-slate-900 dark:text-slate-100 text-base">
            {state.sim.recentRainfall} mm
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 px-3 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "reports"
              ? "border-sky-600 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <span>Reports Queue</span>
          {unverifiedReports.length > 0 && (
            <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950">
              {unverifiedReports.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("closures")}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === "closures"
              ? "border-sky-600 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Road Closures ({activeClosures})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("alerts")}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === "alerts"
              ? "border-sky-600 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Broadcast Alerts
        </button>
        <button
          type="button"
          onClick={onOpenSimulation}
          className="px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1"
          title="Open Simulation Telemetry Sandbox"
        >
          <Sliders className="h-4 w-4" />
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-sm">
        {/* TAB 1: REPORTS QUEUE */}
        {activeTab === "reports" && (
          <div className="space-y-3.5">
            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                {(["Unverified", "Verified", "Dismissed", "All"] as const).map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setReportFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      reportFilter === st
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    {st === "Unverified" ? `Pending (${unverifiedReports.length})` : st}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">{displayedReports.length} report(s)</span>
            </div>

            {/* Reports List */}
            {displayedReports.length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic border rounded-xl">
                No reports found under "{reportFilter}" status.
              </div>
            ) : (
              <div className="space-y-3">
                {displayedReports.map((r) => {
                  const tile = tiles.find((t) => t.id === r.tileId);
                  return (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 space-y-2.5 shadow-xs hover:border-sky-500/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {tile?.locality || r.tileId}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold px-1.5 py-0 ${
                                r.status === "Verified"
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                                  : r.status === "Dismissed"
                                    ? "bg-slate-100 text-slate-500"
                                    : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300"
                              }`}
                            >
                              {r.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Submitted {timeAgo(r.createdAt, Date.now())}</span>
                            <span>
                              • Reported: <strong>{r.severityUser}</strong>
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onFocusTile(r.tileId)}
                          className="h-7 px-2 text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950 gap-1 shrink-0 font-bold"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          <span>Locate</span>
                        </Button>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-snug">
                        {r.description}
                      </p>

                      {/* Photo Thumbnail */}
                      {r.photoUrl && (
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(r.photoUrl!)}
                            className="relative h-16 w-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity bg-black shrink-0"
                          >
                            <img
                              src={r.photoUrl}
                              alt="Report evidence"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                              Zoom Photo
                            </div>
                          </button>
                          <span className="text-xs text-slate-500 leading-tight">
                            Attached photo evidence (click to inspect full resolution)
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {r.status !== "Dismissed" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDismissReport(r.id)}
                            className="h-8 px-3 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 hover:border-red-300 gap-1"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Dismiss</span>
                          </Button>
                        )}
                        {r.status !== "Verified" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleVerifyReport(r.id)}
                            className="h-8 px-3 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-4 w-4" />
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
            {/* New Closure Form */}
            <form
              onSubmit={handleAddIncident}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
            >
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <span>Mark Road Closure / Restriction</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Target Block</label>
                  <select
                    value={incidentTileId}
                    onChange={(e) => setIncidentTileId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-medium"
                  >
                    {tiles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.locality} ({t.ward.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Restriction Level</label>
                  <select
                    value={incidentStatus}
                    onChange={(e) => setIncidentStatus(e.target.value as IncidentStatus)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-medium"
                  >
                    <option value="ClosedAllTraffic">⛔ Closed to All Traffic</option>
                    <option value="ClosedSmallVehicles">🚫 Closed to Small Vehicles</option>
                    <option value="PartiallyFlooded">⚠️ Partially Flooded (Slow)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">
                  Advisory Notes for Public
                </label>
                <Input
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="e.g. Subway closed due to 3ft waterlogging. Traffic diverted via SCLR."
                  className="text-xs sm:text-sm h-9"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-9 font-bold text-xs sm:text-sm gap-1.5 bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="h-4 w-4" />
                <span>Publish Road Closure to Live Map</span>
              </Button>
            </form>

            {/* Active Closures List */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                Active Road Incidents ({state.incidents.length})
              </span>

              {state.incidents.length === 0 ? (
                <div className="py-8 text-center text-slate-500 italic border rounded-xl">
                  No active road closures logged.
                </div>
              ) : (
                state.incidents.map((inc) => {
                  const tile = tiles.find((t) => t.id === inc.tileId);
                  return (
                    <div
                      key={inc.id}
                      className="p-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 space-y-1.5 flex items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {tile?.locality || inc.tileId}
                          </span>
                          <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0">
                            {inc.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {inc.description}
                        </p>
                        <div className="text-[11px] text-slate-400">
                          Updated {timeAgo(inc.updatedAt, Date.now())}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onFocusTile(inc.tileId)}
                          className="h-8 w-8 p-0 text-sky-600"
                          title="Locate on map"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveIncident(inc.id)}
                          className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950 font-bold border-red-300"
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
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
            >
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Send className="h-4 w-4 text-sky-600" />
                <span>Publish Official Municipal Advisory</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Target Ward</label>
                  <select
                    value={alertTargetWard}
                    onChange={(e) => setAlertTargetWard(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-medium"
                  >
                    {ZONES.map((z) => (
                      <option key={z.key} value={z.key}>
                        {z.label} Ward
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Severity Tier</label>
                  <select
                    value={alertSeverity}
                    onChange={(e) => setAlertSeverity(e.target.value as AlertSeverity)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-medium"
                  >
                    <option value="Info">Info (Advisory)</option>
                    <option value="Warning">Warning (Significant Waterlogging)</option>
                    <option value="Critical">Critical (Immediate Danger)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Alert Headline</label>
                <Input
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder="e.g. Severe Waterlogging Warning – Kurla Subway & LBS Marg"
                  className="text-xs sm:text-sm h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Full Advisory Body</label>
                <Textarea
                  rows={2}
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="e.g. Submerged road conditions. Commuters advised to avoid subway. Relief center opened at Municipal School."
                  className="text-xs sm:text-sm resize-none rounded-lg"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-9 font-bold text-xs sm:text-sm gap-2 bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Send className="h-4 w-4" />
                <span>Broadcast Alert to Residents</span>
              </Button>
            </form>

            {/* Published Alerts */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                Published Bulletins ({state.alerts.filter((a) => a.status === "Published").length})
              </span>

              {state.alerts
                .filter((a) => a.status === "Published")
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 space-y-2 flex items-start justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                          {alert.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                        {alert.message}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        Target: {alert.wardLabel || "Corridor"} •{" "}
                        {timeAgo(alert.createdAt, Date.now())}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveAlert(alert.id)}
                      className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
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
          className="sf-modal-backdrop"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] overflow-hidden rounded-xl bg-slate-900 p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Close photo preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewPhoto}
              alt="Evidence Full View"
              className="max-h-[80vh] w-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
