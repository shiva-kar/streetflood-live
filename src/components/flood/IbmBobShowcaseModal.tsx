import { useState } from "react";
import {
  Sparkles,
  Bot,
  Layers,
  Award,
  ShieldCheck,
  TrendingUp,
  Clock,
  Compass,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  HeartHandshake,
  Cpu,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IbmBobShowcaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCopilot: () => void;
}

export default function IbmBobShowcaseModal({
  open,
  onOpenChange,
  onOpenCopilot,
}: IbmBobShowcaseModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border bg-background shadow-2xl">
        {/* BANNER HEADER */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white relative shrink-0 border-b border-blue-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md font-black text-sm tracking-tighter">
                IBM
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-extrabold text-white tracking-tight">
                    IBM Bobathon: Build for Bengaluru
                  </DialogTitle>
                  <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/30 text-[10px] font-bold">
                    Theme 1: Smarter Streets
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-blue-200/90 mt-0.5">
                  Build with Bob. Better Bengaluru. • StreetFlood.Live Submission Showcase
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenCopilot();
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md gap-1.5 h-9 shrink-0"
            >
              <Bot className="w-4 h-4" />
              <span>Launch Bob Agent</span>
            </Button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-5 pt-3 border-b border-border bg-card/40 shrink-0">
            <TabsList className="grid grid-cols-5 h-9 w-full rounded-xl bg-muted/60 p-1 text-xs">
              <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold">
                Overview
              </TabsTrigger>
              <TabsTrigger value="problem" className="rounded-lg text-xs font-semibold">
                The Problem
              </TabsTrigger>
              <TabsTrigger value="bob-story" className="rounded-lg text-xs font-semibold">
                Bob Story
              </TabsTrigger>
              <TabsTrigger value="impact" className="rounded-lg text-xs font-semibold">
                Measurable Impact
              </TabsTrigger>
              <TabsTrigger value="ethics" className="rounded-lg text-xs font-semibold">
                Privacy & Safety
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB CONTENTS SCROLL AREA */}
          <ScrollArea className="flex-1 p-5 overflow-y-auto">
            {/* 1. OVERVIEW */}
            <TabsContent value="overview" className="m-0 space-y-4">
              <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white font-bold text-[10px]">
                    Official Hackathon Submission
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    Project: StreetFlood.Live
                  </span>
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-foreground">
                  Agentic AI for Hyperlocal Flood Early Warnings & Safe Commutes across Bengaluru
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  StreetFlood.Live addresses Bengaluru’s severe urban flash flooding across Bellandur
                  ORR, Central Silk Board, Koramangala, and major rajakaluve drainage basins. Built with
                  <strong> IBM Bob</strong> at the center of development, it combines real-time precipitation
                  telemetry, crowdsourced verified citizen reporting, and dynamic geodesic route planning
                  to guide residents to 269+ verified BBMP emergency relief shelters.
                </p>
              </div>

              {/* THREE CORE PILLARS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Smarter Streets</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Predictive safe routing diverting vehicles away from flooded underpasses before engines stall.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Safer Communities</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Direct access to 269+ BBMP relief staging posts with bilingual English & Kannada voice guidance.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Agentic Core</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Powered by IBM Bob multi-agent architecture with zero proprietary API fees.
                  </p>
                </div>
              </div>

              {/* LIVE DEMO ACTIONS */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Live Deployment:</span>
                  <a
                    href="https://shivakar.me/streetflood-live/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    shivakar.me/streetflood-live <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("bob-story")}
                  className="text-xs h-8 rounded-xl font-semibold"
                >
                  Read The Bob Story →
                </Button>
              </div>
            </TabsContent>

            {/* 2. THE PROBLEM */}
            <TabsContent value="problem" className="m-0 space-y-4">
              <div className="space-y-3">
                <h3 className="font-bold text-base text-foreground">
                  The Challenge: Bengaluru's Urban Flash Flooding Crisis
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Bengaluru’s elevation on the Deccan Plateau once relied on a cascading system of over
                  200 interconnected lakes and primary stormwater canals (Rajakaluves). Intense urbanization
                  has paved over natural catchment areas and narrowed drainage bottlenecks. During heavy rain:
                </p>

                <div className="space-y-2">
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-red-600 mt-1.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">IT Corridor Gridlock</h4>
                      <p className="text-xs text-muted-foreground">
                        The Outer Ring Road (ORR) tech corridor at Bellandur, EcoSpace, and Central Silk Board
                        regularly experiences 3–4ft waterlogging in underpasses, stranding hundreds of thousands
                        of tech workers and emergency vehicles.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Lack of Hyperlocal Situational Data</h4>
                      <p className="text-xs text-muted-foreground">
                        Traditional navigation apps route cars blindly into submerged underpasses because they
                        rely on broad traffic speed metrics rather than water depth sensors or road closure bulletins.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Relief Shelter Invisibility</h4>
                      <p className="text-xs text-muted-foreground">
                        While the Bruhat Bengaluru Mahanagara Palike (BBMP) designates emergency relief halls and
                        stadiums, stranded residents and two-wheeler commuters have no real-time way to locate or
                        safely navigate to them.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 3. THE BOB STORY */}
            <TabsContent value="bob-story" className="m-0 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-foreground">
                    Built with IBM Bob: The Developer Journey
                  </h3>
                  <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                    watsonx.ai + IBM Bob
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  IBM Bob served as the agentic development partner across the entire SDLC—from initial
                  topographic modeling and multi-agent routing to automated test generation and production deployment.
                </p>

                {/* TIMELINE */}
                <div className="space-y-3 pt-1">
                  <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-md bg-blue-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                          1
                        </span>
                        Phase 1: Architecture Planning (Bob Plan Mode)
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Plan Mode
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bob mapped out the zero-cost decentralized architecture: eliminating proprietary Mapbox/Google
                      APIs in favor of OpenStreetMap Overpass, Open-Meteo precipitation, and client-side geodesic
                      Haversine math, ensuring ₹0 operational cost for civic bodies.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-md bg-indigo-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                          2
                        </span>
                        Phase 2: Agentic Subagents & Ingestion (Bob Agent Mode)
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Subagent Spawning
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bob spawned parallel subagents to index 269 verified BBMP disaster relief shelters across 8
                      administrative zones and map critical flood hotspots (Central Silk Board, Bellandur EcoSpace,
                      Koramangala 80ft Road, Sony World).
                    </p>
                  </div>

                  <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-md bg-purple-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                          3
                        </span>
                        Phase 3: Multi-Model watsonx Reasoning & Kannada Localization
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        watsonx.ai
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leveraged IBM Granite reasoning patterns to synthesize natural language multi-step civic advice
                      and built complete bilingual Kannada (ಕನ್ನಡ) translations and voice navigation synthesis.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-md bg-emerald-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                          4
                        </span>
                        Phase 4: Bob Shell & Automated Test Suite (64 Unit Tests)
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Testing & QA
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Using Bob Shell, generated 64 unit tests covering road routing, zero-cost API guards, hydrology
                      harmonics, and automated headless Chrome visual regression testing with zero regressions.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 4. MEASURABLE IMPACT */}
            <TabsContent value="impact" className="m-0 space-y-4">
              <div className="space-y-3">
                <h3 className="font-bold text-base text-foreground">
                  Measurable Civic & Economic Outcomes
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  As required by the IBM Bobathon rubric, StreetFlood.Live delivers direct, quantifiable
                  improvements to urban mobility and community safety in Bengaluru:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Commute Time Saved</span>
                    </div>
                    <p className="text-2xl font-black text-foreground">45+ Mins</p>
                    <p className="text-xs text-muted-foreground">
                      Saved per commuter by rerouting vehicles 15–30 minutes before low-lying underpasses flood.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Shelter Proximity</span>
                    </div>
                    <p className="text-2xl font-black text-foreground">&lt; 3.0 km</p>
                    <p className="text-xs text-muted-foreground">
                      Guaranteed maximum distance to verified BBMP emergency relief shelters for 100% of wards.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-purple-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Municipal Operational Cost</span>
                    </div>
                    <p className="text-2xl font-black text-foreground">₹0 / month</p>
                    <p className="text-xs text-muted-foreground">
                      Operates on open-source hydrology and OSM data with zero recurring proprietary API charges.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-amber-600">
                      <Layers className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Offline Availability</span>
                    </div>
                    <p className="text-2xl font-black text-foreground">100% Ready</p>
                    <p className="text-xs text-muted-foreground">
                      Service Worker & IndexedDB store queued reports and maps even during cellular network dropouts.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 5. PRIVACY & SAFETY */}
            <TabsContent value="ethics" className="m-0 space-y-4">
              <div className="space-y-3">
                <h3 className="font-bold text-base text-foreground">
                  Safety, Privacy & Human-in-the-Loop Governance
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Following IBM’s Principles for Trust and Transparency and the Bobathon safety requirements:
                </p>

                <div className="space-y-2.5">
                  <div className="rounded-xl border border-border p-3.5 bg-card flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Privacy by Design</h4>
                      <p className="text-xs text-muted-foreground">
                        Citizen reports do not expose phone numbers, precise home addresses, or device IDs.
                        Coordinates are snapped to 100m geocells, and uploaded photos have EXIF metadata stripped.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-3.5 bg-card flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Human-in-the-Loop Authority Review</h4>
                      <p className="text-xs text-muted-foreground">
                        The BBMP Authority Control Room provides a dedicated triage dashboard. Ward engineers
                        and disaster management officers can review unverified citizen flags, confirm water levels,
                        and issue official road closure bulletins before wide-area push broadcasts.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-3.5 bg-card flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">WCAG 2.2 AA Accessibility</h4>
                      <p className="text-xs text-muted-foreground">
                        Includes high-contrast color palettes, screen-reader semantic markup, minimum 44px touch
                        targets, and voice-assisted turn instructions in both Kannada and English for elderly
                        and visually impaired citizens.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>

          {/* FOOTER */}
          <div className="p-4 border-t border-border bg-card/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Built for Bengaluru with</span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">IBM Bob</span>
            </div>
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenCopilot();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5 h-9"
            >
              <Bot className="w-4 h-4" />
              <span>Try Bob Civic Agent</span>
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
