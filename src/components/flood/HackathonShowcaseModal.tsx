import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  MapPin,
  Bot,
  Navigation,
  ShieldAlert,
  BarChart3,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Compass,
  FileText,
} from "lucide-react";

interface HackathonShowcaseModalProps {
  open: boolean;
  onClose: () => void;
  onJumpToCorridor: (lat: number, lng: number, name: string) => void;
  onOpenReportModal: () => void;
  onOpenControlRoom: () => void;
  onOpenCivicAssistant: () => void;
  onOpenImpactDashboard: () => void;
}

export default function HackathonShowcaseModal({
  open,
  onClose,
  onJumpToCorridor,
  onOpenReportModal,
  onOpenControlRoom,
  onOpenCivicAssistant,
  onOpenImpactDashboard,
}: HackathonShowcaseModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1.5 pb-2 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-xs shadow-xs">
                IBM
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <span>StreetFlood AI</span>
                  <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30">
                    IBM Bobathon • Build for Bengaluru
                  </Badge>
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  Theme: Smarter Streets, Better Living • Student Category
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-4 h-9 p-1">
            <TabsTrigger value="overview" className="text-[11px] sm:text-xs py-1 px-1 truncate">
              Problem & Solution
            </TabsTrigger>
            <TabsTrigger value="workflows" className="text-[11px] sm:text-xs py-1 px-1 truncate">
              Interactive Workflows
            </TabsTrigger>
            <TabsTrigger value="architecture" className="text-[11px] sm:text-xs py-1 px-1 truncate">
              Tech Architecture
            </TabsTrigger>
            <TabsTrigger value="ibmbob" className="text-[11px] sm:text-xs py-1 px-1 truncate">
              IBM Bob Story
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PROBLEM & SOLUTION */}
          <TabsContent value="overview" className="space-y-4 pt-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/30 border space-y-2">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
                <MapPin className="w-4 h-4" />
                <span>The Bengaluru Urban Flash Flood Challenge</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Bengaluru sits at ~920m elevation across the Deccan Plateau, historically drained by cascading lake networks. Rapid urbanization has choked natural stormwater channels (<em className="text-foreground">Rajakaluves</em>), causing key tech corridors—especially the <strong className="text-foreground">Outer Ring Road (EcoSpace, Bellandur, Silk Board)</strong>—to submerge under 3–4 feet of water during heavy downpours.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border space-y-1.5 bg-card">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Who Is Affected?
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                  <li><strong className="text-foreground">1.5M+ Daily Commuters & Riders:</strong> Two-wheelers and autos risk severe engine hydro-locking in water &gt;15 cm.</li>
                  <li><strong className="text-foreground">Low-Lying Residents:</strong> Families near Bellandur &amp; Madiwala basin facing sudden ground-floor inundation.</li>
                  <li><strong className="text-foreground">BBMP Ward Officers:</strong> Responders lacking automated street-level passability maps or CAP triage tools.</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl border space-y-1.5 bg-card">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Why This Corridor Matters
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                  <li><strong className="text-foreground">Economic Lifeline:</strong> The ORR Mahadevapura tech corridor generates over 30% of Karnataka&apos;s IT revenue.</li>
                  <li><strong className="text-foreground">Drainage Funnel:</strong> Natural terminus of the Koramangala–Challaghatta Valley upstream of Bellandur Lake.</li>
                  <li><strong className="text-foreground">269+ Verified Relief Hubs:</strong> Connected to designated BBMP relief shelters (Kanteerava, Bellandur Hall, Silk Board Post).</li>
                </ul>
              </div>
            </div>

            {/* 1-CLICK JUMP TO CORRIDOR */}
            <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5 flex items-center justify-between">
              <div>
                <strong className="text-foreground block">Explore the Flagship Showcase Corridor:</strong>
                <span className="text-[11px] text-muted-foreground">Outer Ring Road (EcoSpace / Bellandur Underpass)</span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onJumpToCorridor(12.9265, 77.6835, "Bengaluru (Outer Ring Road - EcoSpace)");
                  onClose();
                }}
                className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Jump on Map</span>
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: INTERACTIVE WORKFLOWS */}
          <TabsContent value="workflows" className="space-y-3.5 pt-3 text-xs">
            <p className="text-muted-foreground">
              Experience the dual-sided civic platform built for both citizens and municipal authorities:
            </p>

            <div className="space-y-2.5">
              {/* Resident Workflow */}
              <div className="p-3 rounded-xl border bg-card flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      Resident Workflow
                    </Badge>
                    <span className="font-bold text-foreground">Hyperlocal Flood Reporting &amp; Safety</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Report localized street water depth (Footpath, Ankles, Knees, Waist+) with instant AI pre-analysis, automatic EXIF privacy stripping, and offline IndexedDB queueing.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenReportModal();
                  }}
                  className="h-8 text-xs shrink-0 gap-1 cursor-pointer"
                >
                  <span>Test Report</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>

              {/* Safe Evacuation Routing */}
              <div className="p-3 rounded-xl border bg-card flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30">
                      Evacuation Engine
                    </Badge>
                    <span className="font-bold text-foreground">OSRM Road Geometry Routing</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Calculates road-following evacuation routes to nearest BBMP shelters, evaluating multimodal vehicle clearances (pedestrian: 15cm, 2-wheeler: 12cm, car: 22cm, rescue: 60cm) and dynamically avoiding closed roads.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onJumpToCorridor(12.9265, 77.6835, "Bengaluru (Outer Ring Road)");
                    onClose();
                  }}
                  className="h-8 text-xs shrink-0 gap-1 cursor-pointer"
                >
                  <span>View Route</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>

              {/* Municipal Control Room */}
              <div className="p-3 rounded-xl border bg-card flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30">
                      Municipal Workflow
                    </Badge>
                    <span className="font-bold text-foreground">AI-Assisted Authority Control Room</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    BBMP officers review unverified reports, inspect spatial incident clusters, declare official road closures, and approve AI-drafted Common Alerting Protocol (CAP) broadcasts.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenControlRoom();
                  }}
                  className="h-8 text-xs shrink-0 gap-1 cursor-pointer"
                >
                  <span>Open Console</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>

              {/* Civic AI Assistant */}
              <div className="p-3 rounded-xl border bg-card flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30">
                      Agentic AI
                    </Badge>
                    <span className="font-bold text-foreground">IBM Bob Civic Assistant</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Bilingual (English &amp; Kannada ಕನ್ನಡ) conversational copilot grounded strictly in active telemetry, road closures, and verified shelter databases.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenCivicAssistant();
                  }}
                  className="h-8 text-xs shrink-0 gap-1 cursor-pointer"
                >
                  <span>Ask AI</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: TECH ARCHITECTURE */}
          <TabsContent value="architecture" className="space-y-3.5 pt-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/30 border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Strict Zero-Cost &amp; Decentralized Stack</span>
                <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">
                  ₹0 Municipal Cost
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Built with zero recurring map licensing fees, protecting civic budgets while maintaining enterprise resilience.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl border bg-card">
                <span className="text-[10px] text-muted-foreground block">Frontend Core</span>
                <strong className="text-foreground text-xs">React 19 &amp; TS 5.8</strong>
              </div>
              <div className="p-2.5 rounded-xl border bg-card">
                <span className="text-[10px] text-muted-foreground block">Geospatial</span>
                <strong className="text-foreground text-xs">Leaflet &amp; OSM</strong>
              </div>
              <div className="p-2.5 rounded-xl border bg-card">
                <span className="text-[10px] text-muted-foreground block">Routing</span>
                <strong className="text-foreground text-xs">Project OSRM</strong>
              </div>
              <div className="p-2.5 rounded-xl border bg-card">
                <span className="text-[10px] text-muted-foreground block">Telemetry</span>
                <strong className="text-foreground text-xs">Open-Meteo Radar</strong>
              </div>
            </div>

            {/* CONTROLLED AGENTIC WORKFLOW DIAGRAM */}
            <div className="p-3.5 rounded-xl border bg-card space-y-2">
              <span className="font-bold text-foreground block">Controlled Agentic Workflow Lifecycle:</span>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-1 rounded bg-muted border">1. Citizen Report</span>
                <span className="text-muted-foreground">→</span>
                <span className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300">2. AI Analysis</span>
                <span className="text-muted-foreground">→</span>
                <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">3. Anomaly Check</span>
                <span className="text-muted-foreground">→</span>
                <span className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300">4. Municipal Review</span>
                <span className="text-muted-foreground">→</span>
                <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">5. Human Approval</span>
                <span className="text-muted-foreground">→</span>
                <span className="px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300">6. Public Advisory &amp; Map Update</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                AI acts as a decision-support copilot; all consequential road closures and emergency broadcasts require explicit municipal human approval.
              </p>
            </div>
          </TabsContent>

          {/* TAB 4: IBM BOB STORY */}
          <TabsContent value="ibmbob" className="space-y-3.5 pt-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-600/10 via-indigo-600/10 to-purple-600/10 border border-sky-500/30 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-foreground">Developed with IBM Bob Across the Entire SDLC</span>
              </div>
              <p className="text-muted-foreground">
                IBM Bob served as our autonomous pair-programming architect, enabling rapid prototyping, geospatial ingestion, and automated verification:
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl border bg-card space-y-1">
                <span className="font-bold text-foreground">1. Architecture &amp; Zero-Cost Guardrails (Bob Plan Mode)</span>
                <p className="text-[11px] text-muted-foreground">
                  Designed the decentralized, zero-cost operational model substituting commercial mapping APIs with OpenStreetMap Overpass, OSRM routing, and Open-Meteo precipitation telemetry.
                </p>
              </div>

              <div className="p-3 rounded-xl border bg-card space-y-1">
                <span className="font-bold text-foreground">2. Specialized Parallel Subagents</span>
                <p className="text-[11px] text-muted-foreground">
                  Ingested authoritative OpenStreetMap road networks across Bengaluru (Outer Ring Road, Silk Board, Panathur) and compiled the verified directory of 269+ BBMP emergency relief shelters.
                </p>
              </div>

              <div className="p-3 rounded-xl border bg-card space-y-1">
                <span className="font-bold text-foreground">3. Agentic Civic Copilot (watsonx.ai Agentic Architecture)</span>
                <p className="text-[11px] text-muted-foreground">
                  Built the bilingual reasoning engine supporting English and Kannada (ಕನ್ನಡ) with executable map actions, spatial deduplication, and anomaly detection.
                </p>
              </div>

              <div className="p-3 rounded-xl border bg-card space-y-1">
                <span className="font-bold text-foreground">4. Automated Quality Assurance (Bob Shell)</span>
                <p className="text-[11px] text-muted-foreground">
                  Executed 76+ automated unit and integration tests verifying zero-cost API guards, vehicle clearance limits, consensus scoring, and mobile docking integrity.
                </p>
              </div>
            </div>

            {/* IMPACT BUTTON */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-muted-foreground">View validated outcomes &amp; response time reduction:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenImpactDashboard();
                }}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
                <span>Open Impact Dashboard</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
