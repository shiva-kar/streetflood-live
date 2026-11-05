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
} from "lucide-react";
import { createLiveAlert, createLiveIncident, type UserProfile } from "@/lib/supabase/client";
import type { FloodAlert, FloodReport, IncidentStatus, RoadIncident } from "@/lib/flood/types";
import { searchPlaces } from "@/lib/flood/openData";
import { reverseGeocode } from "@/lib/reporting/reverseGeocoder";
import { ALL_PRELOADED_OSM_ROADS } from "@/lib/flood/osmNetwork";
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
  const [webhookWard, setWebhookWard] = useState("L Ward");

  const pendingReports = reports.filter((r) => r.status === "Unverified");
  const lifecycleSteps = ["Reported", "Dispatched to Ward Field Unit", "Drainage Pump Active", "Water Receding", "Cleared"];

  // Synchronize closure coordinates with mapCenter when opened
  useEffect(() => {
    if (open) {
      setClosureCoords(mapCenter);
    }
  }, [open, mapCenter]);  // Contextual Quick Corridors based on coordinates
  const quickCorridors = useMemo(() => {
    // Near Bengaluru (~12.97) - Primary Focus:
    if (Math.abs(mapCenter[0] - 12.97) < 0.45 || (mapCenter[0] > 12.8 && mapCenter[0] < 13.2 && mapCenter[1] > 77.4 && mapCenter[1] < 77.8)) {
      return ["Outer Ring Road (EcoSpace)", "Koramangala 80ft Road", "Central Silk Board", "Sarjapur Road", "Old Airport Road", "Hosur Road", "Bellary Road"];
    }
    // Near Mumbai (~19.05):
    if (Math.abs(mapCenter[0] - 19.05) < 0.25) {
      return ["LBS Marg", "CST Road", "Sion Circle", "SCLR Flyover", "Eastern Express Highway", "Kurla West Subway"];
    }
    // Near Delhi (~28.6):
    if (Math.abs(mapCenter[0] - 28.6) < 0.35) {
      return ["Ring Road", "Outer Ring Road", "Vikas Marg", "Mathura Road", "GT Karnal Road", "Barapullah Elevated Road"];
    }
    // Near Bengaluru (~12.97):
    if (Math.abs(mapCenter[0] - 12.97) < 0.35) {
      return ["Outer Ring Road", "Hosur Road", "Old Airport Road", "Koramangala 80ft Road", "Bellary Road"];
    }
    // Near Kolkata (~22.57):
    if (Math.abs(mapCenter[0] - 22.57) < 0.35) {
      return ["EM Bypass", "VIP Road", "Strand Road", "AJC Bose Road", "Diamond Harbour Road"];
    }
    return ["Arterial Corridor", "Station Approach Road", "Riverbank Underpass", "Ring Bypass Highway"];
  }, [mapCenter]);

  // Handle user typing into Road Name input
  const handleRoadNameChange = (val: string) => {
    setRoadName(val);
    setShowSuggestions(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    // 1. Instant local search from OSM network segments (Bengaluru & National)
    const query = val.toLowerCase().trim();
    const localMatches = ALL_PRELOADED_OSM_ROADS
      .filter((r) => r.name && r.name.toLowerCase().includes(query))
      .slice(0, 8)
      .map((r) => {
        const mid = r.coordinates[Math.floor(r.coordinates.length / 2)] || mapCenter;
        return {
          name: r.name,
          type: r.highway ? `${r.highway.toUpperCase()} CORRIDOR` : "ROAD",
          lat: mid[0],
          lng: mid[1],
        };
      });

    const seen = new Set<string>();
    const initialSuggestions = localMatches.filter((m) => {
      if (seen.has(m.name.toLowerCase())) return false;
      seen.add(m.name.toLowerCase());
      return true;
    });

    setSuggestions(initialSuggestions);

    // 2. Debounced live OpenStreetMap search for wider / worldwide queries
    if (val.trim().length >= 2) {
      setIsSearchingRoads(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const places = await searchPlaces(`${val.trim()} road`);
          const osmPlaces = places.slice(0, 5).map((p) => ({
            name: p.name,
            type: "OSM VERIFIED STREET",
            lat: p.lat,
            lng: p.lng,
          }));

          setSuggestions((prev) => {
            const combined = [...prev];
            for (const op of osmPlaces) {
              if (!seen.has(op.name.toLowerCase())) {
                seen.add(op.name.toLowerCase());
                combined.push(op);
              }
            }
            return combined.slice(0, 8);
          });
        } catch {
          // Keep local matches
        } finally {
          setIsSearchingRoads(false);
        }
      }, 250);
    }
  };

  const handleSelectSuggestion = (s: RoadSuggestion) => {
    setRoadName(s.name);
    setClosureCoords([s.lat, s.lng]);
    setShowSuggestions(false);
    if (!incidentDesc) {
      setIncidentDesc(`${s.name}: Road impassable due to deep floodwater. Diverting all vehicular traffic.`);
    }
    toast.success(`Selected ${s.name} (locked at [${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}])`);
  };

  const handleQuickCorridorClick = (corridor: string) => {
    handleRoadNameChange(corridor);
    // Find matching coordinates from preloaded road networks
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0" />
            <DialogTitle className="text-lg sm:text-xl font-bold">
              Authority Control Room & Operations
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Manage official road closures, verify citizen reports, and broadcast targeted flood alerts.
          </DialogDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadIncidentFeed}
            className="w-full text-xs h-8 mt-1 gap-1.5"
          >
            Export Incident Feed (GeoJSON + CAP)
          </Button>
        </DialogHeader>

        <Tabs defaultValue="closures" className="w-full mt-1">
          <TabsList className="grid w-full grid-cols-4 h-9 p-1">
            <TabsTrigger value="closures" className="text-[11px] sm:text-xs py-1 px-1 truncate">
              Closures ({incidents.length})
            </TabsTrigger>
            <TabsTrigger value="moderation" className="text-[11px] sm:text-xs py-1 px-1 truncate">
              Review ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="text-[11px] sm:text-xs py-1 px-1 truncate">
              Dispatch
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-[11px] sm:text-xs py-1 px-1 truncate">
              Alerts
            </TabsTrigger>
          </TabsList>



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
                  className="h-7 text-[10px] gap-1 px-2 border-border"
                >
                  <Crosshair className="w-3 h-3 text-primary" />
                  Detect at Map Center
                </Button>
              </div>

              {/* ROAD NAME AUTOCOMPLETE INPUT */}
              <div className="space-y-1 relative">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                  <span>Road / Corridor Name</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Target: [{closureCoords[0].toFixed(4)}, {closureCoords[1].toFixed(4)}]
                  </span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="Type road name (e.g. LBS Marg, CST Road, Ring Road)..."
                    value={roadName}
                    onChange={(e) => handleRoadNameChange(e.target.value)}
                    onFocus={() => {
                      if (roadName.trim()) setShowSuggestions(true);
                    }}
                    className="h-9 text-xs pr-8"
                    required
                  />
                  {isSearchingRoads && (
                    <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
                  )}
                </div>

                {/* AUTOCOMPLETE DROPDOWN */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover rounded-xl border border-border shadow-lg max-h-52 overflow-y-auto py-1">
                    {suggestions.map((s, idx) => (
                      <button
                        key={`${s.name}_${idx}`}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between gap-2 border-b last:border-b-0 border-border/40"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            {s.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 shrink-0 font-medium">
                          {s.type}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* QUICK CORRIDOR CHIPS */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Quick Arterial Corridors:</span>
                <div className="flex flex-wrap gap-1">
                  {quickCorridors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleQuickCorridorClick(c)}
                      className="text-[10px] px-2 py-0.5 rounded-md border bg-background hover:bg-muted text-foreground transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
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
                    <SelectItem value="ClosedAllTraffic">Closed to all traffic (Emergency impassable)</SelectItem>
                    <SelectItem value="ClosedSmallVehicles">Closed to small vehicles (Heavy rescue only)</SelectItem>
                    <SelectItem value="PartiallyFlooded">Partially flooded (Drive with extreme caution)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Public Advisory Note</label>
                <Input
                  placeholder="e.g. Submerged under 2 feet water, emergency pumps active"
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <Button type="submit" disabled={isSubmittingIncident} className="w-full h-9 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold">
                <Ban className="w-3.5 h-3.5" />
                {isSubmittingIncident ? "Publishing Closure..." : "Publish Official Road Closure"}
              </Button>
            </form>

            {/* ACTIVE CLOSURES LIST WITH REOPEN OPTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Active Road Closures ({incidents.length})</p>
                <span className="text-[10px] text-muted-foreground">Affects live routing engine</span>
              </div>
              {incidents.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground border rounded-lg bg-card">
                  No active road closures currently declared.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {incidents.map((inc) => (
                    <div key={inc.id} className="p-2.5 rounded-lg border bg-card text-xs flex items-center justify-between gap-2 shadow-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{inc.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {inc.status} • {inc.lat != null && inc.lng != null ? `${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}` : "Sector Landmark"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] bg-red-500/10 text-red-600 font-semibold px-2 py-0.5 rounded">
                          Active
                        </span>
                        {onRemoveIncident && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onRemoveIncident(inc.id)}
                            className="h-7 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-1 px-2"
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
              <p className="text-xs font-semibold">Incident Lifecycle Dispatch & Resources</p>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setResource("pump")} className={`text-xs ${resource === "pump" ? "border-primary" : ""}`}>
                  Deploy Pump
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setResource("sandbags")} className={`text-xs ${resource === "sandbags" ? "border-primary" : ""}`}>
                  Deploy Sandbags
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setResource("rescueBoat")} className={`text-xs ${resource === "rescueBoat" ? "border-primary" : ""}`}>
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
                        className="h-7 text-[10px]"
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
                    placeholder="Ward Name (e.g. L Ward, F-North)"
                    value={webhookWard}
                    onChange={(e) => setWebhookWard(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Button type="button" size="sm" onClick={broadcastWardAlert} className="h-8 text-xs">
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
                    <SelectItem value="Warning">🟠 Warning (Flash Flood & Inundation Watch)</SelectItem>
                    <SelectItem value="Info">🔵 Informational (General Precaution Advisory)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Alert Headline</label>
                <Input
                  placeholder="e.g. Mithi River Overflow: Immediate Evacuation of Low-Lying Belts"
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

              <Button type="submit" disabled={isSubmittingAlert} className="w-full h-9 text-xs gap-1.5 font-bold">
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
