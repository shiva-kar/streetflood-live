import { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Check,
  X,
  AlertTriangle,
  Radio,
  Ban,
  Eye,
  Search,
  MapPin,
  Crosshair,
  Loader2,
  CornerDownRight,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Navigation,
  Compass,
  FileCheck,
} from "lucide-react";
import { createLiveAlert, createLiveIncident, type UserProfile } from "@/lib/supabase/client";
import type { FloodAlert, FloodReport, IncidentStatus, RoadIncident, Shelter } from "@/lib/flood/types";
import type { RealWeatherResult } from "@/lib/flood/openData";
import { searchPlaces } from "@/lib/flood/openData";
import { reverseGeocode } from "@/lib/reporting/reverseGeocoder";
import { ALL_PRELOADED_OSM_ROADS } from "@/lib/flood/osmNetwork";
import {
  generateMunicipalTriageSummary,
  getWorkflowAuditLogs,
  recordWorkflowStep,
} from "@/lib/ai/agenticWorkflow";
import { recordImpactEvent } from "@/lib/flood/impactTracker";
import { toast } from "sonner";

interface ControlRoomModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  reports: FloodReport[];
  incidents: RoadIncident[];
  alerts: FloodAlert[];
  mapCenter: [number, number];
  weather?: RealWeatherResult | null;
  shelters?: Shelter[];
  onVerifyReport: (reportId: string) => void;
  onDismissReport: (reportId: string) => void;
  onAddIncident: (inc: RoadIncident) => void;
  onRemoveIncident?: (incidentId: string) => void;
  onAddAlert: (alert: FloodAlert) => void;
}

interface RoadSuggestion {
  name: string;
  type: string;
  lat: number;
  lng: number;
}

export default function ControlRoomModal({
  open,
  onClose,
  currentUser,
  reports,
  incidents,
  alerts,
  mapCenter,
  weather = null,
  shelters = [],
  onVerifyReport,
  onDismissReport,
  onAddIncident,
  onRemoveIncident,
  onAddAlert,
}: ControlRoomModalProps) {
  // Road Incident Form State
  const [roadName, setRoadName] = useState("");
  const [closureCoords, setClosureCoords] = useState<[number, number]>(mapCenter);
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus>("ClosedAllTraffic");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);

  // Road Autocomplete state
  const [suggestions, setSuggestions] = useState<RoadSuggestion[]>([]);
  const [isSearchingRoads, setIsSearchingRoads] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Broadcast Alert Form State
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<"Critical" | "Warning" | "Info">("Critical");
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);
  const [lifecycle, setLifecycle] = useState<Record<string, number>>({});
  const [resource, setResource] = useState<"pump" | "sandbags" | "rescueBoat">("pump");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookWard, setWebhookWard] = useState("Mahadevapura (Ward 150)");

  const pendingReports = reports.filter((r) => r.status === "Unverified");
  const lifecycleSteps = ["Reported", "Dispatched to Ward Field Unit", "Drainage Pump Active", "Water Receding", "Cleared"];

  // AI-Assisted Municipal Triage Summary (Phase 4 B)
  const aiTriage = useMemo(
    () => generateMunicipalTriageSummary(reports, incidents, weather, shelters),
    [reports, incidents, weather, shelters]
  );

  const auditLogs = useMemo(() => getWorkflowAuditLogs(), [open, reports, incidents]);

  // Synchronize closure coordinates with mapCenter when opened
  useEffect(() => {
    if (open) {
      setClosureCoords(mapCenter);
    }
  }, [open, mapCenter]);

  // Contextual Quick Corridors based on coordinates
  const quickCorridors = useMemo(() => {
    // Near Bengaluru (~12.97) - Primary Focus:
    if (Math.abs(mapCenter[0] - 12.97) < 0.45 || (mapCenter[0] > 12.8 && mapCenter[0] < 13.2 && mapCenter[1] > 77.4 && mapCenter[1] < 77.8)) {
      return ["Outer Ring Road (EcoSpace)", "Koramangala 80ft Road", "Central Silk Board", "Sarjapur Road", "Panathur Railway Underpass", "Old Airport Road", "Hosur Road"];
    }
    // Near Mumbai (~19.05):
    if (Math.abs(mapCenter[0] - 19.05) < 0.25) {
      return ["LBS Marg", "CST Road", "Sion Circle", "SCLR Flyover", "Eastern Express Highway", "Kurla West Subway"];
    }
    return ["Outer Ring Road (EcoSpace)", "Central Silk Board", "Koramangala 80ft Road", "Arterial Highway"];
  }, [mapCenter]);

  const handleRoadNameChange = (val: string) => {
    setRoadName(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim() || val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Fast local match across preloaded OSM roads
    const q = val.toLowerCase();
    const localMatches: RoadSuggestion[] = ALL_PRELOADED_OSM_ROADS
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((r) => {
        const mid = r.coordinates[Math.floor(r.coordinates.length / 2)] || [mapCenter[0], mapCenter[1]];
        return {
          name: r.name,
          type: r.highway,
          lat: mid[0],
          lng: mid[1],
        };
      });

    if (localMatches.length > 0) {
      setSuggestions(localMatches);
      setShowSuggestions(true);
    }

    // Debounced Nominatim query for any additional street
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearchingRoads(true);
        const places = await searchPlaces(`${val}, Bengaluru`);
        if (places.length > 0) {
          const remote: RoadSuggestion[] = places.map((p) => ({
            name: p.name,
            type: p.type,
            lat: p.lat,
            lng: p.lng,
          }));
          setSuggestions((prev) => {
            const combined = [...prev, ...remote];
            const seen = new Set<string>();
            return combined.filter((s) => {
              if (seen.has(s.name.toLowerCase())) return false;
              seen.add(s.name.toLowerCase());
              return true;
            }).slice(0, 6);
          });
          setShowSuggestions(true);
        }
      } catch {
        // Keep local matches
      } finally {
        setIsSearchingRoads(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (s: RoadSuggestion) => {
    setRoadName(s.name);
    setClosureCoords([s.lat, s.lng]);
    setShowSuggestions(false);
    if (!incidentDesc) {
      setIncidentDesc(`${s.name}: Official roadblock declared due to severe waterlogging.`);
    }
    toast.success(`Selected ${s.name} (locked at [${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}])`);
  };

  const handleQuickCorridorClick = (corridor: string) => {
    handleRoadNameChange(corridor);
    const q = corridor.toLowerCase();
    const match = ALL_PRELOADED_OSM_ROADS.find(
      (r) =>
        r.name?.toLowerCase() === q ||
        r.name?.toLowerCase().includes(q) ||
        q.includes(r.name?.toLowerCase() || ""),
    );
    if (match && match.coordinates.length > 0) {
      const mid = match.coordinates[Math.floor(match.coordinates.length / 2)];
      if (mid) setClosureCoords(mid);
    }
    setRoadName(corridor);
    setShowSuggestions(false);
    if (!incidentDesc) {
      setIncidentDesc(`${corridor}: Official roadblock declared due to severe waterlogging.`);
    }
  };

  const handleDetectStreetAtCenter = async () => {
    setIsSearchingRoads(true);
    try {
      const geo = await reverseGeocode(mapCenter[0], mapCenter[1]);
      const detectedName = geo.road || geo.neighbourhood || geo.displayName.split(",")[0];
      if (detectedName) {
        setRoadName(detectedName);
        setClosureCoords(mapCenter);
        if (!incidentDesc) {
          setIncidentDesc(`${detectedName}: Road closed by authority at crosshair.`);
        }
        toast.success(`Auto-detected road: ${detectedName}`);
      } else {
        setRoadName(`Corridor at ${mapCenter[0].toFixed(4)}, ${mapCenter[1].toFixed(4)}`);
        setClosureCoords(mapCenter);
      }
    } catch {
      setRoadName(`Crosshair Corridor (${mapCenter[0].toFixed(4)}, ${mapCenter[1].toFixed(4)})`);
      setClosureCoords(mapCenter);
    } finally {
      setIsSearchingRoads(false);
    }
  };

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
    const cap = `<?xml version="1.0" encoding="UTF-8"?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>streetflood-${Date.now()}</identifier><sender>streetflood.live</sender><sent>${new Date().toISOString()}</sent><status>Actual</status><msgType>Update</msgType><scope>Public</scope><info><category>Met</category><event>Urban flood incident feed</event><urgency>Immediate</urgency><severity>Severe</severity><certainty>Observed</certainty><headline>Disaster Management municipal flood incident feed</headline><description>Active citizen reports and road incidents exported for civic coordination.</description></info></alert>`;
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
      toast.error("Please enter or select a road or corridor name.");
      return;
    }
    setIsSubmittingIncident(true);
    try {
      const newInc: RoadIncident = {
        id: `inc_${Date.now()}`,
        tileId: `t_${Math.floor(closureCoords[0] / 0.001)}_${Math.floor(closureCoords[1] / 0.001)}`,
        status: incidentStatus,
        description: incidentDesc.trim() || `${roadName}: Road closed by authority`,
        lat: closureCoords[0],
        lng: closureCoords[1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "Authority",
      };

      try {
        await createLiveIncident({
          roadName: roadName.trim(),
          status: incidentStatus,
          description: newInc.description,
          lat: closureCoords[0],
          lng: closureCoords[1],
        });
      } catch {
        // Fallback to local state
      }

      recordWorkflowStep({
        reportId: newInc.id,
        stage: "HumanApproved",
        actor: "BBMP Ward Officer",
        details: `Official road closure declared: ${roadName} (${incidentStatus}).`,
      });

      onAddIncident(newInc);
      toast.success(`Official road closure declared: ${roadName}`);
      setRoadName("");
      setIncidentDesc("");
      setShowSuggestions(false);
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
        id: `alt_${Date.now()}`,
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
          title: newAlert.title,
          message: newAlert.message,
          severity: newAlert.severity,
        });
      } catch {
        // Fallback
      }

      recordWorkflowStep({
        reportId: newAlert.id,
        stage: "PublicAdvisory",
        actor: "BBMP Ward Officer",
        details: `Published official civic flood advisory: "${newAlert.title}".`,
      });
      recordImpactEvent("alert_broadcast");

      onAddAlert(newAlert);
      toast.success("Civic alert broadcast successfully.");
      setAlertTitle("");
      setAlertMessage("");
    } finally {
      setIsSubmittingAlert(false);
    }
  };

  const handleApproveDraftedAdvisory = () => {
    const adv = aiTriage.draftedPublicAdvisory;
    const newAlert: FloodAlert = {
      id: `alt_ai_${Date.now()}`,
      title: adv.titleEn,
      message: `${adv.messageEn} | ${adv.messageKn}`,
      severity: adv.severity,
      type: "Municipal",
      status: "Published",
      tileIds: [],
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };

    recordWorkflowStep({
      reportId: newAlert.id,
      stage: "HumanApproved",
      actor: "BBMP Ward Officer",
      details: `Approved AI-drafted Common Alerting Protocol advisory for ${adv.targetWards.join(", ")}.`,
    });
    recordImpactEvent("alert_broadcast");

    onAddAlert(newAlert);
    toast.success("AI-drafted bilingual advisory approved and broadcast live.");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5">
        <DialogHeader className="space-y-1.5 pb-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0" />
              <DialogTitle className="text-lg sm:text-xl font-bold">
                Authority Control Room &amp; Operations
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadIncidentFeed}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              Export CAP / GeoJSON
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            AI-assisted incident triage, official road closures, and Common Alerting Protocol (CAP) broadcasts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai_triage" className="w-full mt-1">
          <TabsList className="grid w-full grid-cols-5 h-9 p-1">
            <TabsTrigger value="ai_triage" className="text-[10px] sm:text-xs py-1 px-0.5 truncate flex items-center justify-center gap-1 font-bold text-sky-700 dark:text-sky-300">
              <Sparkles className="w-3 h-3 text-sky-600" />
              <span>AI Triage</span>
            </TabsTrigger>
            <TabsTrigger value="closures" className="text-[10px] sm:text-xs py-1 px-0.5 truncate">
              Closures ({incidents.length})
            </TabsTrigger>
            <TabsTrigger value="moderation" className="text-[10px] sm:text-xs py-1 px-0.5 truncate">
              Review ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="text-[10px] sm:text-xs py-1 px-0.5 truncate">
              Dispatch
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-[10px] sm:text-xs py-1 px-0.5 truncate">
              Alerts
            </TabsTrigger>
          </TabsList>

          {/* TAB 0: AI TRIAGE & ADVISORY ASSISTANT (PHASE 4 B) */}
          <TabsContent value="ai_triage" className="space-y-3.5 pt-3 text-xs">
            {/* INCIDENT CLUSTERS */}
            <div className="p-3 rounded-xl border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  Active Incident Clusters ({aiTriage.clusters.length})
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Radius: ~400m
                </span>
              </div>

              {aiTriage.clusters.length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-2 text-center">
                  No active report clusters detected. Normal waterlogging levels.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {aiTriage.clusters.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg border bg-background space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-foreground">{c.name}</strong>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${
                            c.trend === "Rapidly Deteriorating"
                              ? "bg-red-500/10 text-red-600 border-red-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {c.trend}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>Reports: {c.reportCount}</span>
                        <span>•</span>
                        <span>Avg Depth: ~{c.averageDepthCm}cm</span>
                        <span>•</span>
                        <span>{c.ward}</span>
                      </div>
                      {c.recommendedEvacuationShelter && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                          Recommended Refuge: {c.recommendedEvacuationShelter.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEVERED EVACUATION CORRIDORS */}
            {aiTriage.severedEvacuationRoutes.length > 0 && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Severed Evacuation Corridors</span>
                </div>
                {aiTriage.severedEvacuationRoutes.map((r, idx) => (
                  <div key={idx} className="text-[11px] text-muted-foreground border-t border-red-500/10 pt-1">
                    <strong className="text-foreground">{r.corridorName}: </strong>
                    <span>{r.recommendedDetour}</span>
                  </div>
                ))}
              </div>
            )}

            {/* PRE-DRAFTED BILINGUAL PUBLIC ADVISORY WITH 1-CLICK HUMAN APPROVAL */}
            <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-600" />
                  AI-Drafted Common Alerting Protocol (CAP) Advisory
                </span>
                <Badge variant="outline" className="text-[9px] border-sky-500/40 text-sky-600">
                  Requires Municipal Approval
                </Badge>
              </div>

              <div className="space-y-1 bg-background/80 p-2.5 rounded-lg border text-[11px]">
                <p className="font-bold text-foreground">{aiTriage.draftedPublicAdvisory.titleEn}</p>
                <p className="text-muted-foreground">{aiTriage.draftedPublicAdvisory.messageEn}</p>
                <p className="font-semibold text-foreground pt-1 border-t">{aiTriage.draftedPublicAdvisory.titleKn}</p>
                <p className="text-muted-foreground">{aiTriage.draftedPublicAdvisory.messageKn}</p>
              </div>

              <Button
                type="button"
                onClick={handleApproveDraftedAdvisory}
                className="w-full h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1.5 cursor-pointer shadow-sm"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Approve &amp; Broadcast Official Advisory</span>
              </Button>
            </div>

            {/* CONTROLLED AGENTIC WORKFLOW AUDIT TRAIL */}
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Agentic Workflow Audit Trail</span>
                <span className="text-[10px] text-muted-foreground">Immutable Log</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-[10px] font-mono">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-1.5 rounded border bg-background/60">
                    <span className="text-sky-600 font-bold">[{log.stage}]</span> {log.actor}: {log.details}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 1: MODERATION */}
          <TabsContent value="moderation" className="space-y-3 pt-3">
            {pendingReports.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Check className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                All citizen flood reports have been reviewed!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {pendingReports.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border bg-card space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">
                            {r.depthMeters ? `${r.depthMeters.toFixed(1)}m Water` : r.waterDepth}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                            {r.severityUser}
                          </span>
                        </div>
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
                          recordWorkflowStep({
                            reportId: r.id,
                            stage: "HumanApproved",
                            actor: "BBMP Ward Officer",
                            details: `Verified report at [${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}]. Flood severity boosted.`,
                          });
                          recordImpactEvent("report_reviewed");
                          onVerifyReport(r.id);
                          toast.success("Report verified and score boosted.");
                        }}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1 gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Verify (Human Sign-off)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          recordWorkflowStep({
                            reportId: r.id,
                            stage: "Dismissed",
                            actor: "BBMP Ward Officer",
                            details: `Dismissed report at [${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}] as uncorroborated.`,
                          });
                          recordImpactEvent("report_reviewed");
                          onDismissReport(r.id);
                          toast.info("Report dismissed.");
                        }}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 flex-1 gap-1 cursor-pointer"
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

          {/* TAB 2: ROAD CLOSURES WITH INTELLIGENT AUTOCOMPLETE */}
          <TabsContent value="closures" className="space-y-4 pt-3">
            <form onSubmit={handleCreateClosure} className="space-y-3.5 p-3.5 rounded-xl bg-muted/40 border">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-destructive" />
                  Declare Road Closure / Corridor Barrier
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectStreetAtCenter}
                  disabled={isSearchingRoads}
                  className="h-7 text-[10px] gap-1 px-2 border-border cursor-pointer"
                >
                  <Crosshair className="w-3 h-3 text-primary" />
                  Detect at Map Center
                </Button>
              </div>

              {/* ROAD NAME AUTOCOMPLETE INPUT */}
              <div className="space-y-1 relative">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                  <span>Corridor / Street Name</span>
                  {isSearchingRoads && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </label>
                <div className="relative">
                  <Input
                    placeholder="e.g. Outer Ring Road, EcoSpace Underpass, Silk Board..."
                    value={roadName}
                    onChange={(e) => handleRoadNameChange(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    className="h-9 text-xs pl-8"
                    required
                  />
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-3 pointer-events-none" />
                </div>

                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-16 left-0 right-0 bg-background border rounded-xl shadow-lg z-50 overflow-hidden text-xs">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/80 flex items-center justify-between border-b last:border-b-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate font-semibold">{s.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono ml-2 shrink-0">
                          {s.lat.toFixed(3)}, {s.lng.toFixed(3)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick Corridor Selection Chips */}
                <div className="pt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground py-0.5 mr-1">Quick Corridors:</span>
                  {quickCorridors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleQuickCorridorClick(c)}
                      className="text-[10px] px-2 py-0.5 rounded-full border bg-background hover:bg-muted font-medium transition-colors cursor-pointer"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
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
                      <SelectItem value="ClosedAllTraffic">⛔ Closed to All Traffic</SelectItem>
                      <SelectItem value="ClosedSmallVehicles">🚫 Closed to Small Vehicles</SelectItem>
                      <SelectItem value="PartiallyFlooded">⚠️ Partially Flooded (Caution)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Closure Coordinates</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.0001"
                      value={closureCoords[0]}
                      onChange={(e) => setClosureCoords([parseFloat(e.target.value) || 0, closureCoords[1]])}
                      className="h-9 text-[11px] font-mono px-1.5"
                    />
                    <Input
                      type="number"
                      step="0.0001"
                      value={closureCoords[1]}
                      onChange={(e) => setClosureCoords([closureCoords[0], parseFloat(e.target.value) || 0])}
                      className="h-9 text-[11px] font-mono px-1.5"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Officer Instructions / Detour Notes</label>
                <Textarea
                  placeholder="e.g. Submerged under 3 feet of water. Divert vehicles via elevated flyover."
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  className="text-xs h-16 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmittingIncident}
                className="w-full h-9 text-xs gap-1.5 font-bold cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                {isSubmittingIncident ? "Enforcing Closure..." : "Declare & Publish Official Road Closure"}
              </Button>
            </form>

            {/* ACTIVE INCIDENTS LIST */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Active Road Closures ({incidents.length})</span>
                <span className="text-[10px] text-muted-foreground">Immediate OSRM Rerouting Active</span>
              </div>
              {incidents.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3 text-center rounded-lg border border-dashed">
                  No active road closures currently declared.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 bg-card"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-destructive">
                            {inc.status === "ClosedAllTraffic" ? "⛔ Closed to All Traffic" : inc.status === "ClosedSmallVehicles" ? "🚫 Closed to Small Vehicles" : "⚠️ Partially Flooded"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{inc.description}</p>
                        {inc.lat != null && inc.lng != null && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Coordinates: {inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {onRemoveIncident && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRemoveIncident(inc.id)}
                            className="h-7 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-1 px-2 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reopen
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: DISPATCH & WARD WEBHOOK */}
          <TabsContent value="dispatch" className="space-y-3 pt-3">
            <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold">Incident Lifecycle Dispatch &amp; Resources</p>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setResource("pump")} className={`text-xs cursor-pointer ${resource === "pump" ? "border-primary" : ""}`}>
                  Deploy Pump
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setResource("sandbags")} className={`text-xs cursor-pointer ${resource === "sandbags" ? "border-primary" : ""}`}>
                  Deploy Sandbags
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setResource("rescueBoat")} className={`text-xs cursor-pointer ${resource === "rescueBoat" ? "border-primary" : ""}`}>
                  Deploy Boat
                </Button>
              </div>
              <div className="space-y-1">
                {incidents.slice(0, 5).map((incident) => {
                  const step = lifecycle[incident.id] ?? 0;
                  return (
                    <div key={incident.id} className="rounded border bg-background p-2 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{incident.description}</span>
                        <p className="text-[10px] text-muted-foreground">{lifecycleSteps[step]}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] cursor-pointer"
                        onClick={() => {
                          const next = Math.min(step + 1, lifecycleSteps.length - 1);
                          setLifecycle((prev) => ({ ...prev, [incident.id]: next }));
                          toast.success(`Dispatched ${resource}: stage moved to ${lifecycleSteps[next]}`);
                        }}
                      >
                        Advance Stage
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-semibold">Emergency Ward Webhook</p>
                <Input
                  placeholder="https://civic.ward.local/api/flood-alert"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Ward Name (e.g. Mahadevapura Ward 150)"
                    value={webhookWard}
                    onChange={(e) => setWebhookWard(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Button type="button" size="sm" onClick={broadcastWardAlert} className="h-8 text-xs cursor-pointer">
                    Trigger Webhook
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: BROADCAST ALERT */}
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
                    <SelectItem value="Critical">🔴 Critical (Immediate Evacuation Advisory)</SelectItem>
                    <SelectItem value="Warning">🟠 Warning (Flash Flood &amp; Inundation Watch)</SelectItem>
                    <SelectItem value="Info">🔵 Informational (General Precaution Advisory)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Alert Headline</label>
                <Input
                  placeholder="e.g. Outer Ring Road EcoSpace Underpass Submerged: Immediate Evacuation Advisory"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Broadcast Message</label>
                <Textarea
                  placeholder="Explain risks, instructions, and designated emergency evacuation centers..."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  className="text-xs min-h-[70px]"
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmittingAlert} className="w-full h-9 text-xs gap-1.5 font-bold cursor-pointer">
                <Radio className="w-3.5 h-3.5" />
                {isSubmittingAlert ? "Broadcasting..." : "Broadcast Alert to All Citizens"}
              </Button>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Active Broadcast Alerts ({alerts.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {alerts.map((al) => (
                  <div key={al.id} className="p-2.5 rounded-lg border text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{al.title}</p>
                      <p className="text-[10px] text-muted-foreground">{al.severity} • {al.message}</p>
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">
                      Live
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
