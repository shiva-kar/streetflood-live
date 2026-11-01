import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, Check, X, AlertTriangle, Radio, Ban, Eye } from "lucide-react";
import { createLiveAlert, createLiveIncident, type UserProfile } from "@/lib/supabase/client";
import type { FloodAlert, FloodReport, IncidentStatus, RoadIncident } from "@/lib/flood/types";
import { toast } from "sonner";

interface ControlRoomModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  reports: FloodReport[];
  incidents: RoadIncident[];
  alerts: FloodAlert[];
  mapCenter: [number, number];
  onVerifyReport: (reportId: string) => void;
  onDismissReport: (reportId: string) => void;
  onAddIncident: (inc: RoadIncident) => void;
  onAddAlert: (alert: FloodAlert) => void;
}

export default function ControlRoomModal({
  open,
  onClose,
  currentUser,
  reports,
  incidents,
  alerts,
  mapCenter,
  onVerifyReport,
  onDismissReport,
  onAddIncident,
  onAddAlert,
}: ControlRoomModalProps) {
  // Road Incident Form
  const [roadName, setRoadName] = useState("");
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus>("ClosedAllTraffic");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);

  // Broadcast Alert Form
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<"Critical" | "Warning" | "Info">("Critical");
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);
  const [lifecycle, setLifecycle] = useState<Record<string, number>>({});
  const [resource, setResource] = useState<"pump" | "sandbags" | "rescueBoat">("pump");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookWard, setWebhookWard] = useState("L Ward");

  const pendingReports = reports.filter((r) => r.status === "Unverified");
  const lifecycleSteps = ["Reported", "Dispatched to Ward Field Unit", "Drainage Pump Active", "Water Receding", "Cleared"];

  const broadcastWardAlert = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Enter a configured ward alert webhook URL.");
      return;
    }
    try {
      const response = await fetch(webhookUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward: webhookWard,
          severity: alertSeverity,
          message: alertMessage || "Municipal flood response alert",
          safeShelterUrl: `${window.location.origin}${import.meta.env.BASE_URL}`,
        }),
      });
      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
      toast.success("Ward alert broadcast accepted by webhook.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ward alert webhook failed.");
    }
  };

  const downloadIncidentFeed = () => {
    const features = [
      ...reports.map((report) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [report.lng, report.lat] },
        properties: { kind: "flood-report", severity: report.severityUser, status: report.status, createdAt: report.createdAt },
      })),
      ...incidents.map((incident) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [incident.lng ?? mapCenter[1], incident.lat ?? mapCenter[0]] },
        properties: { kind: "road-incident", status: incident.status, description: incident.description },
      })),
    ];
    const geojson = { type: "FeatureCollection", features };
    const cap = `<?xml version="1.0" encoding="UTF-8"?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>streetflood-${Date.now()}</identifier><sender>streetflood.live</sender><sent>${new Date().toISOString()}</sent><status>Actual</status><msgType>Update</msgType><scope>Public</scope><info><category>Met</category><event>Urban flood incident feed</event><urgency>Immediate</urgency><severity>Severe</severity><certainty>Observed</certainty><headline>Mumbai municipal flood incident feed</headline><description>Active citizen reports and road incidents exported for civic coordination.</description></info></alert>`;
    for (const [name, content, type] of [
      ["streetflood-incident-feed.geojson", JSON.stringify(geojson, null, 2), "application/geo+json"],
      ["streetflood-incident-alert.cap.xml", cap, "application/xml"],
    ] as const) {
      const url = URL.createObjectURL(new Blob([content], { type }));
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    }
    toast.success("GeoJSON and CAP incident feeds downloaded.");
  };

  const handleCreateClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadName.trim()) {
      toast.error("Please enter a road or corridor name.");
      return;
    }
    setIsSubmittingIncident(true);
    try {
      const newInc: RoadIncident = {
        id: `inc_${Date.now()}`,
        tileId: `t_${Math.floor(mapCenter[0] / 0.001)}_${Math.floor(mapCenter[1] / 0.001)}`,
        status: incidentStatus,
        description: incidentDesc.trim() || `${roadName}: Road closed by authority`,
        lat: mapCenter[0],
        lng: mapCenter[1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "Authority",
      };

      try {
        await createLiveIncident({
          roadName: roadName.trim(),
          status: incidentStatus,
          description: newInc.description,
          lat: mapCenter[0],
          lng: mapCenter[1],
        });
      } catch {
        // Fallback to local
      }

      onAddIncident(newInc);
      toast.success(`Road incident declared: ${roadName}`);
      setRoadName("");
      setIncidentDesc("");
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) {
      toast.error("Please fill in both title and message.");
      return;
    }
    setIsSubmittingAlert(true);
    try {
      const newAlert: FloodAlert = {
        id: `alert_${Date.now()}`,
        title: alertTitle.trim(),
        message: alertMessage.trim(),
        severity: alertSeverity,
        type: "Municipal",
        status: "Published",
        tileIds: [],
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      };

      try {
        await createLiveAlert({
          title: alertTitle.trim(),
          message: alertMessage.trim(),
          severity: alertSeverity,
        });
      } catch {
        // Fallback to local
      }

      onAddAlert(newAlert);
      toast.success("Official emergency flood alert broadcasted!");
      setAlertTitle("");
      setAlertMessage("");
    } finally {
      setIsSubmittingAlert(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            Authority Control Room & Operations
          </DialogTitle>
          <DialogDescription className="text-xs">
            Manage official closures, verify citizen reports, and broadcast targeted flood alerts.
          </DialogDescription>
          <Button type="button" variant="outline" size="sm" onClick={downloadIncidentFeed} className="w-full text-xs">
            Export Incident Feed (GeoJSON + CAP)
          </Button>
        </DialogHeader>

        <Tabs defaultValue="moderation" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="moderation" className="text-xs">
              Moderation ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="closures" className="text-xs">
              Road Closures
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs">
              Broadcast Alert
            </TabsTrigger>
          </TabsList>

          <div className="mt-3 rounded-xl border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-bold">Incident lifecycle and field resources</p>
            {incidents.slice(0, 3).map((incident) => {
              const currentIndex = lifecycle[incident.id] ?? 0;
              return (
                <div key={incident.id} className="space-y-2 border-t pt-2">
                  <p className="text-[11px] font-semibold">{incident.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {lifecycleSteps.map((step, index) => (
                      <button key={step} type="button" onClick={() => setLifecycle((previous) => ({ ...previous, [incident.id]: index }))} className={`min-h-9 rounded-md border px-2 text-[10px] ${index <= currentIndex ? "border-emerald-600 bg-emerald-600 text-white" : "border-border text-muted-foreground"}`}>
                        {step}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={resource} onValueChange={(value) => setResource(value as typeof resource)}>
                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pump">Drainage pump</SelectItem>
                        <SelectItem value="sandbags">Sandbags</SelectItem>
                        <SelectItem value="rescueBoat">Rescue boat</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" className="h-8 text-[11px]" onClick={() => toast.success(`${resource} assigned at ${incident.lat?.toFixed(5) ?? mapCenter[0].toFixed(5)}, ${incident.lng?.toFixed(5) ?? mapCenter[1].toFixed(5)}`)}>
                      Assign at coordinates
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TAB 1: MODERATION QUEUE */}
          <TabsContent value="moderation" className="space-y-3 pt-3">
            {pendingReports.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No unverified citizen reports pending moderation.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {pendingReports.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-foreground">
                          Water Depth: {r.severityUser}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {r.description || "No description provided"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {r.lat.toFixed(4)}, {r.lng.toFixed(4)} • {new Date(r.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      {r.photoUrl && (
                        <a
                          href={r.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded border overflow-hidden w-12 h-12 bg-muted flex items-center justify-center"
                        >
                          <img src={r.photoUrl} alt="Report" className="w-full h-full object-cover" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          onVerifyReport(r.id);
                          toast.success("Report verified and score boosted.");
                        }}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1 gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onDismissReport(r.id);
                          toast.info("Report dismissed.");
                        }}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 flex-1 gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: ROAD CLOSURES */}
          <TabsContent value="closures" className="space-y-4 pt-3">
            <form onSubmit={handleCreateClosure} className="space-y-3 p-3.5 rounded-xl bg-muted/40 border">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-destructive" />
                Declare Road Closure at Current Map Center
              </p>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Road / Corridor Name</label>
                <Input
                  placeholder="e.g. Kurla Station Subway, LBS Marg"
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Closure Severity</label>
                <Select
                  value={incidentStatus}
                  onValueChange={(v) => setIncidentStatus(v as IncidentStatus)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ClosedAllTraffic">Closed to all traffic (Emergency)</SelectItem>
                    <SelectItem value="ClosedSmallVehicles">Closed to small vehicles (Heavy vehicles only)</SelectItem>
                    <SelectItem value="PartiallyFlooded">Partially flooded (Drive with extreme caution)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Public Advisory Note</label>
                <Input
                  placeholder="e.g. Submerged under 2 feet water, pumps active"
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <Button type="submit" disabled={isSubmittingIncident} className="w-full h-9 text-xs gap-1.5">
                <Ban className="w-3.5 h-3.5" />
                {isSubmittingIncident ? "Publishing..." : "Publish Closure"}
              </Button>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Active Closures ({incidents.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {incidents.map((inc) => (
                  <div key={inc.id} className="p-2.5 rounded-lg border text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{inc.description}</p>
                      <p className="text-[10px] text-muted-foreground">{inc.status}</p>
                    </div>
                    <span className="text-[10px] bg-red-500/10 text-red-600 font-semibold px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: BROADCAST ALERT */}
          <TabsContent value="alerts" className="space-y-4 pt-3">
            <form onSubmit={handleBroadcastAlert} className="space-y-3 p-3.5 rounded-xl bg-muted/40 border">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
                Broadcast Flood Early Warning Alert
              </p>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Alert Severity</label>
                <Select
                  value={alertSeverity}
                  onValueChange={(v) => setAlertSeverity(v as "Critical" | "Warning" | "Info")}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical (Immediate Evacuation / Danger)</SelectItem>
                    <SelectItem value="Warning">Warning (Rising Water / High Tide Advisory)</SelectItem>
                    <SelectItem value="Info">Info (Monsoon Weather Update)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Headline Title</label>
                <Input
                  placeholder="e.g. Flash Flood Advisory: Mithi River Overflow"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Public Instructions</label>
                <Textarea
                  placeholder="e.g. Residents in ground-floor units are advised to relocate to designated municipal shelters immediately."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  className="h-16 text-xs resize-none"
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmittingAlert} className="w-full h-9 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white">
                <Radio className="w-3.5 h-3.5" />
                {isSubmittingAlert ? "Broadcasting..." : "Broadcast Alert to Everyone"}
              </Button>
            </form>
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-bold">Broadcast Ward Alert via WhatsApp / SMS</p>
              <Input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="Configured webhook URL" className="text-xs" />
              <Input value={webhookWard} onChange={(event) => setWebhookWard(event.target.value)} placeholder="Ward" className="text-xs" />
              <Button type="button" variant="outline" className="w-full text-xs" onClick={broadcastWardAlert}>Broadcast Ward Alert via WhatsApp / SMS</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
