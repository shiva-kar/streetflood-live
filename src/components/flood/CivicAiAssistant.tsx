import { useState, useTransition } from "react";
import {
  Sparkles,
  Bot,
  Send,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  MapPin,
  Phone,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Languages,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  runBobCivicAgent,
  type AgenticQueryResponse,
  type AgentAction,
} from "@/lib/ai/bengaluruAgent";
import type { FloodReport, RoadIncident, Shelter } from "@/lib/flood/types";
import type { RealWeatherResult } from "@/lib/flood/openData";

export interface CivicAiAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPos: [number, number];
  weather: RealWeatherResult | null;
  reports: FloodReport[];
  incidents: RoadIncident[];
  shelters?: Shelter[];
  onExecuteAction: (action: AgentAction) => void;
  activeCityName?: string;
}

const QUICK_PROMPTS = [
  {
    label: "Is Outer Ring Road (EcoSpace) safe?",
    labelKn: "ಹೊರ ವರ್ತುಲ ರಸ್ತೆ ಸುರಕ್ಷಿತವೇ?",
    query: "Is Outer Ring Road (EcoSpace) safe right now?",
  },
  {
    label: "Central Silk Board underpass status",
    labelKn: "ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಅಂಡರ್‌ಪಾಸ್ ಸ್ಥಿತಿ",
    query: "What is the status of Central Silk Board underpass?",
  },
  {
    label: "Find nearest emergency relief shelter",
    labelKn: "ಹತ್ತಿರದ ತುರ್ತು ಆಶ್ರಯ ತಾಣ",
    query: "Where is the nearest emergency relief shelter?",
  },
  {
    label: "Why is a road classified as Critical?",
    labelKn: "ರಸ್ತೆಯನ್ನು ಕ್ರಿಟಿಕಲ್ ಎಂದು ಏಕೆ ವರ್ಗೀಕರಿಸಲಾಗಿದೆ?",
    query: "Why is this road classified as Critical risk?",
  },
  {
    label: "What should I prepare before evacuating?",
    labelKn: "ಸ್ಥಳಾಂತರಕ್ಕೆ ಮುನ್ನ ಏನು ಸಿದ್ಧಪಡಿಸಬೇಕು?",
    query: "What should I prepare before evacuating?",
  },
  {
    label: "Emergency civic helplines",
    labelKn: "ತುರ್ತು ಸಹಾಯವಾಣಿ",
    query: "What are the official disaster helpline numbers?",
  },
];

export default function CivicAiAssistant({
  open,
  onOpenChange,
  userPos,
  weather,
  reports,
  incidents,
  shelters = [],
  onExecuteAction,
  activeCityName = "Bengaluru",
}: CivicAiAssistantProps) {
  const [query, setQuery] = useState("");
  const [currentResponse, setCurrentResponse] = useState<AgenticQueryResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const [langKn, setLangKn] = useState(false);

  const handleRunQuery = (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    startTransition(async () => {
      const res = await runBobCivicAgent(q, {
        userPos,
        weather,
        reports,
        incidents,
        shelters,
        activeCityName,
      });
      setCurrentResponse(res);
    });
  };

  const statusConfig = {
    Safe: {
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      label: "Clear & Passable",
      labelKn: "ಸುರಕ್ಷಿತ & ಸಂಚಾರಯೋಗ್ಯ",
    },
    Caution: {
      color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      label: "Waterlogging Caution",
      labelKn: "ಜಲಾವೃತ ಎಚ್ಚರಿಕೆ",
    },
    Impassable: {
      color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
      icon: <ShieldAlert className="w-4 h-4 text-red-600" />,
      label: "Closed / Impassable",
      labelKn: "ಮುಚ್ಚಲಾಗಿದೆ / ಅಪಾಯಕಾರಿ",
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border bg-background shadow-2xl">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-800 p-4 text-white relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-sm">
                <Bot className="w-5 h-5 text-sky-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold text-white tracking-tight">
                    StreetFlood Civic Assistant
                  </DialogTitle>
                  <Badge className="bg-white/20 hover:bg-white/30 text-white text-[10px] border-white/20 font-semibold px-2 py-0.5">
                    Civic AI Copilot
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-sky-100">
                  Agentic civic intelligence powered by multi-agent hydrology & route reasoning
                </DialogDescription>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLangKn(!langKn)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium border border-white/20 transition-colors"
              title="Toggle English / ಕನ್ನಡ"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{langKn ? "English" : "ಕನ್ನಡ"}</span>
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <ScrollArea className="flex-1 p-4 overflow-y-auto">
          {/* INTRO CAROUSEL / QUICK CHIPS */}
          {!currentResponse && !isPending && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <p>
                  {langKn
                    ? "ನಮಸ್ಕಾರ! ನಾನು ಸ್ಟ್ರೀಟ್‌ಫ್ಲಡ್ ಸಿವಿಕ್ ಅಸಿಸ್ಟೆಂಟ್. ರಸ್ತೆ ಜಲಾವೃತ, ರಾಜಕಾಲುವೆ ಒಳಹರಿವು ಹಾಗೂ ತುರ್ತು ಆಶ್ರಯ ತಾಣಗಳ ಬಗ್ಗೆ ನನಗೆ ಯಾವುದೇ ಪ್ರಶ್ನೆ ಕೇಳಿ."
                    : "Ask the StreetFlood Civic Assistant about real-time corridor passability (Outer Ring Road, Silk Board, Sion-Kurla, LBS Marg), stormwater surge, or nearest emergency relief centers."}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">
                  {langKn ? "ತ್ವರಿತ ಪ್ರಶ್ನೆಗಳು (Quick Prompts):" : "Recommended Civic Inquiries:"}
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRunQuery(p.query)}
                      className="text-left px-3 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span>{langKn ? p.labelKn : p.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LOADING STATE */}
          {isPending && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-sky-600/20 border-t-sky-600 animate-spin" />
                <Bot className="w-5 h-5 text-sky-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">StreetFlood Multi-Agent Reasoning...</p>
                <p className="text-[11px] text-muted-foreground">
                  Cross-referencing real-time telemetry, hydrology, OSM corridors, and verified emergency shelters
                </p>
              </div>
            </div>
          )}

          {/* RESPONSE RESULT */}
          {currentResponse && !isPending && (
            <div className="space-y-4">
              {/* STATUS & HEADLINE */}
              <div className="rounded-xl border p-3.5 bg-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={`gap-1.5 px-2.5 py-1 text-xs font-bold ${
                      statusConfig[currentResponse.status].color
                    }`}
                  >
                    {statusConfig[currentResponse.status].icon}
                    <span>
                      {langKn
                        ? statusConfig[currentResponse.status].labelKn
                        : statusConfig[currentResponse.status].label}
                    </span>
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {currentResponse.timestamp}
                  </span>
                </div>

                <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                  {langKn ? currentResponse.headlineKn : currentResponse.headline}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {langKn ? currentResponse.explanationKn : currentResponse.explanation}
                </p>
              </div>

              {/* AGENTIC REASONING TRACE */}
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    {langKn
                      ? "ಏಜೆಂಟ್ ವಿಶ್ಲೇಷಣಾ ಹಂತಗಳು (Agentic Reasoning Trace):"
                      : "Multi-Agent Reasoning & Decision Trace:"}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                    Neural Hydrology Agent
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(langKn ? currentResponse.reasoningStepsKn : currentResponse.reasoningSteps).map(
                    (step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                        <span className="h-4 w-4 rounded-full bg-sky-600/10 text-sky-600 dark:text-sky-400 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                          {sIdx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* DATA GROUNDING & TRUST */}
              {currentResponse.dataGrounding && (
                <div className="rounded-xl border bg-card p-2.5 text-[10px] text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>Data Grounding &amp; Real-Time Sources</span>
                    <ShieldAlert className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-1 pt-0.5">
                    <div>Telemetry: <strong className="text-foreground">{currentResponse.dataGrounding.telemetrySource}</strong></div>
                    <div>Shelters Queried: <strong className="text-foreground">{currentResponse.dataGrounding.verifiedSheltersQueried} verified</strong></div>
                    <div>Reports Corroborated: <strong className="text-foreground">{currentResponse.dataGrounding.activeReportsCorroborated}</strong></div>
                    <div>Closures Checked: <strong className="text-foreground">{currentResponse.dataGrounding.activeClosuresChecked}</strong></div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              {currentResponse.suggestedActions.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    {langKn ? "ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಮಗಳು:" : "Recommended Civic Actions:"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentResponse.suggestedActions.map((act) => (
                      <Button
                        key={act.id}
                        size="sm"
                        variant={act.type === "navigate" ? "default" : "outline"}
                        onClick={() => {
                          onExecuteAction(act);
                          onOpenChange(false);
                        }}
                        className="text-xs gap-1.5 rounded-xl h-9 font-semibold cursor-pointer"
                      >
                        {act.type === "navigate" && <Navigation className="w-3.5 h-3.5" />}
                        {act.type === "pan" && <MapPin className="w-3.5 h-3.5 text-sky-600" />}
                        {act.type === "call" && <Phone className="w-3.5 h-3.5 text-red-600" />}
                        <span>{langKn ? act.labelKn : act.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* RESET TO QUICK PROMPTS */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentResponse(null)}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  {langKn ? "← ಇನ್ನೊಂದು ಪ್ರಶ್ನೆ ಕೇಳಿ" : "← Ask another question"}
                </button>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* FOOTER INPUT */}
        <div className="p-3 border-t border-border bg-card/60 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunQuery(query);
            }}
            className="flex items-center gap-2"
          >
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                langKn
                  ? "ರಸ್ತೆ ಸ್ಥಿತಿ ಅಥವಾ ತುರ್ತು ಆಶ್ರಯ ತಾಣಗಳ ಬಗ್ಗೆ ಕೇಳಿ..."
                  : "Ask about road conditions, flood risk, or nearest relief shelters..."
              }
              className="text-xs sm:text-sm h-10 rounded-xl bg-background"
            />
            <Button
              type="submit"
              disabled={!query.trim() || isPending}
              size="sm"
              className="h-10 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shrink-0 font-bold cursor-pointer"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>StreetFlood Civic Intelligence</span>
            <span className="font-mono">Real-Time Routing & Hydrology</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Deprecated alias for backwards compatibility
export { CivicAiAssistant as IbmBobCivicCopilot };
export type { CivicAiAssistantProps as IbmBobCivicCopilotProps };
