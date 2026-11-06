import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Clock,
  ShieldCheck,
  Navigation,
  Building2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Download,
  Info,
} from "lucide-react";
import type { FloodReport, RoadIncident, Shelter } from "@/lib/flood/types";
import {
  computeLiveImpactStats,
  getDemonstrationScenario,
} from "@/lib/flood/impactTracker";
import { toast } from "sonner";

interface ImpactDashboardModalProps {
  open: boolean;
  onClose: () => void;
  reports: FloodReport[];
  incidents: RoadIncident[];
  shelters: Shelter[];
}

export default function ImpactDashboardModal({
  open,
  onClose,
  reports,
  incidents,
  shelters,
}: ImpactDashboardModalProps) {
  const stats = useMemo(
    () => computeLiveImpactStats(reports, incidents, shelters),
    [reports, incidents, shelters]
  );
  const scenario = useMemo(() => getDemonstrationScenario(), []);

  const handleExportSummary = () => {
    const text = `STREETFLOOD AI — CIVIC IMPACT SUMMARY (BENGALURU)
Date: ${new Date().toLocaleString("en-IN")}
---------------------------------------------------------
1. Real Application Performance Indicators:
- Citizen Flood Reports Submitted: ${stats.totalReports}
- Reports Reviewed by Authority: ${stats.reviewedReports} (${stats.reviewPct}%)
- Average Authority Review Latency: ${stats.avgReviewLatencyMin} minutes
- Hazardous Road Segments Flagged: ${stats.hazardousRoadSegmentsFlagged}
- Road-Based Safe Evacuation Routes Calculated: ${stats.evacuationRoutesCalculated}
- Verified Disaster Relief Shelters Ready: ${stats.accessibleSheltersCount}

2. Calibrated Corridor Scenario Analysis:
Corridor: ${scenario.corridor}
- Standard Unassisted Delay: ${scenario.uncoordinatedCommute.avgDelayMinutes} min (Risk: ${scenario.uncoordinatedCommute.hazardExposureRisk})
- StreetFlood AI Rerouted Delay: ${scenario.streetFloodAiResponse.avgDelayMinutes} min (Risk: ${scenario.streetFloodAiResponse.hazardExposureRisk})
- Commute Time Saved: ${scenario.commuteTimeSavedMinutes} min per commuter
- Engine Hydro-Lock Risk Reduction: ${scenario.riskReductionPct}%

Methodology Note: Indicators derived from active application events and calibrated historical observations. Decision-support data.
`;
    navigator.clipboard?.writeText(text);
    toast.success("Civic impact summary copied to clipboard.");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1.5 pb-2 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
                <BarChart3 className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold">
                Measurable Civic Impact Dashboard
              </DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSummary}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Summary</span>
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Real application indicators and scenario-based validation for Bengaluru urban flood resilience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {/* 1. KEY APPLICATION METRICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Reports Processed</span>
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {stats.totalReports}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {stats.reviewPct}% reviewed by BBMP
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Review Latency</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {stats.avgReviewLatencyMin} <span className="text-xs font-normal text-muted-foreground">min</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                AI pre-analysis speedup
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Hazardous Roads</span>
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {stats.hazardousRoadSegmentsFlagged}
              </div>
              <p className="text-[10px] text-muted-foreground">
                OSM corridors monitored
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Evacuation Routes</span>
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {stats.evacuationRoutesCalculated}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Road-following geometries
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Verified Shelters</span>
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {stats.accessibleSheltersCount}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Across 8 BBMP zones
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Municipal Cost</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground">
                ₹0 <span className="text-xs font-normal text-muted-foreground">/ mo</span>
              </div>
              <p className="text-[10px] text-emerald-600 font-semibold">
                100% open-data tier
              </p>
            </div>
          </div>

          {/* 2. COMPARATIVE SCENARIO DEMONSTRATION */}
          <div className="p-4 rounded-2xl border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  Corridor Response Demonstration
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {scenario.corridor}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30">
                Calibrated Test Scenario
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Uncoordinated Commute */}
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-700 dark:text-red-400">
                    Standard Unassisted Commute
                  </span>
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                    High Risk
                  </Badge>
                </div>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Average Delay:</span>
                    <strong className="text-foreground">{scenario.uncoordinatedCommute.avgDelayMinutes} mins</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Engine Hydro-Lock Risk:</span>
                    <strong className="text-red-600">{scenario.uncoordinatedCommute.engineHydroLockRiskPct}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Shelter Discovery Time:</span>
                    <strong className="text-foreground">{scenario.uncoordinatedCommute.shelterDiscoveryTimeMin} mins</strong>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground border-t pt-1.5">
                  {scenario.uncoordinatedCommute.outcomeDescription}
                </p>
              </div>

              {/* StreetFlood AI Early Warning */}
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    StreetFlood AI Early Rerouting
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500 text-emerald-600">
                    Protected
                  </Badge>
                </div>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Average Delay:</span>
                    <strong className="text-foreground">{scenario.streetFloodAiResponse.avgDelayMinutes} mins</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Engine Hydro-Lock Risk:</span>
                    <strong className="text-emerald-600">{scenario.streetFloodAiResponse.engineHydroLockRiskPct}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Shelter Discovery Time:</span>
                    <strong className="text-foreground">{scenario.streetFloodAiResponse.shelterDiscoveryTimeMin} mins</strong>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground border-t pt-1.5">
                  {scenario.streetFloodAiResponse.outcomeDescription}
                </p>
              </div>
            </div>

            {/* IMPACT SUMMARY CALLOUT */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-semibold text-foreground">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Commute Time Saved:</span>
              </div>
              <span className="font-bold text-sky-700 dark:text-sky-300">
                ~ {scenario.commuteTimeSavedMinutes} minutes saved per commuter
              </span>
            </div>
          </div>

          {/* 3. HONEST DATA PROVENANCE & METHODOLOGY NOTE */}
          <div className="p-3 rounded-xl border bg-muted/20 text-[11px] text-muted-foreground space-y-1 flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground block">Methodology & Data Transparency:</strong>
              Indicators are calculated from actual in-memory and persisted storage events across the current user session and historical BBMP corridor benchmarks. The platform provides decision support and does not claim certified life-saving statistics.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
