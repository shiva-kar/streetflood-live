import { useState } from "react";
import {
  X,
  AlertCircle,
  Clock,
  Camera,
  Navigation,
  LifeBuoy,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Waves,
  Sparkles,
  ArrowRight,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/flood/engine";
import type { FloodReport, RoadIncident, Tile } from "@/lib/flood/types";

interface TileDetailsSheetProps {
  tile: Tile | null;
  reports: FloodReport[];
  incident?: RoadIncident | null;
  onClose: () => void;
  onReportHere: (tileId: string) => void;
  onRouteFrom: (tileId: string) => void;
  onRouteTo: (tileId: string) => void;
  onOpenPreparedness: () => void;
}

const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  Low: {
    bg: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    text: "Low Risk",
    label: "Safe to pass",
  },
  Moderate: {
    bg: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30",
    text: "Moderate Risk",
    label: "Water pooling",
  },
  High: {
    bg: "bg-orange-500/20 text-orange-900 dark:text-orange-200 border-orange-500/30",
    text: "High Risk",
    label: "Two-wheelers stalling",
  },
  Critical: {
    bg: "bg-red-500/25 text-red-900 dark:text-red-200 border-red-500/40",
    text: "Critical Risk",
    label: "Impassable / Danger",
  },
};

export default function TileDetailsSheet({
  tile,
  reports,
  incident,
  onClose,
  onReportHere,
  onRouteFrom,
  onRouteTo,
  onOpenPreparedness,
}: TileDetailsSheetProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!tile) return null;

  const tileReports = reports.filter((r) => r.tileId === tile.id);
  const photos = tileReports.map((r) => r.photoUrl).filter(Boolean) as string[];
  const badge = RISK_BADGE[tile.currentRiskLevel];
  const isHighOrCritical = tile.currentRiskLevel === "High" || tile.currentRiskLevel === "Critical";

  return (
    <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[410px] max-h-[82vh] z-30 flex flex-col rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden transition-all animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between p-3.5 border-b bg-muted/40">
        <div className="space-y-0.5 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Block {tile.row + 1}
              {String.fromCharCode(65 + (tile.col % 26))} • {tile.ward.toUpperCase()}
            </span>
            {tile.isHotspot && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1 py-0 bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20"
              >
                Known Hotspot
              </Badge>
            )}
          </div>
          <h3 className="font-display font-bold text-base text-foreground truncate">
            {tile.locality}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content Scroll */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {/* Severity Banner */}
        <div className="rounded-lg border p-3 flex items-center justify-between gap-3 bg-muted/20">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">
              Current Flood Severity
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display font-extrabold text-2xl tracking-tight text-foreground">
                {tile.currentSeverityScore}
                <span className="text-xs font-normal text-muted-foreground"> / 100</span>
              </span>
              <Badge className={`text-xs px-2 py-0.5 border ${badge.bg}`}>{badge.text}</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{badge.label}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
              <Clock className="h-3 w-3" />
              <span>{timeAgo(tile.lastUpdated, Date.now())}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Sensor:{" "}
              <span className="font-medium text-foreground">Level {tile.sensorLevel}/4</span>
            </div>
          </div>
        </div>

        {/* Severity Score Breakdown */}
        {tile.severityBreakdown.length > 0 && (
          <div className="rounded-lg border border-border/80 bg-muted/10 p-2.5 space-y-1.5">
            <div className="text-[11px] font-semibold text-foreground flex items-center justify-between">
              <span>Severity Score Calculation</span>
              <span className="text-[10px] font-normal text-muted-foreground">Rule-based</span>
            </div>
            <ul className="space-y-1">
              {tile.severityBreakdown.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-[11px] text-muted-foreground"
                >
                  <span>• {item.split(":")[0]}</span>
                  <span className="font-mono font-medium text-foreground">
                    {item.split(":")[1] || ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Road Incident Warning if any */}
        {incident && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 flex items-start gap-2.5 text-red-950 dark:text-red-200">
            <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="space-y-0.5 min-w-0">
              <div className="font-bold text-xs">Official Road Incident</div>
              <p className="text-[11px] text-red-800 dark:text-red-300 leading-snug">
                {incident.description}
              </p>
            </div>
          </div>
        )}

        {/* 3-Hour Predictive Flood Risk (Feature 6) */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-bold text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>3-Hour Predictive Early Warning</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0 border ${
                tile.predictedRisk === "Moderate"
                  ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40"
              }`}
            >
              Predicted: {tile.predictedRisk} Risk
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Forecast Rainfall:{" "}
            <strong className="text-foreground">
              {tile.forecastRainfallNext3Hours.toFixed(0)} mm
            </strong>{" "}
            • Drainage Capacity Score:{" "}
            <strong className="text-foreground">{tile.drainageScore.toFixed(0)}/100</strong>
          </p>
          <div className="space-y-1 pt-1">
            <div className="text-[10px] font-semibold text-muted-foreground">
              Prediction Factors:
            </div>
            <ul className="space-y-0.5">
              {tile.predictionReasons.map((reason, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-[9px] text-muted-foreground/80 italic pt-1 border-t border-amber-500/20">
            Simulated rule-based prediction. Not for official life-safety decisions.
          </div>
        </div>

        {/* Photos Gallery */}
        {photos.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Crowdsourced Photos ({photos.length})</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSelectedPhoto(url)}
                  className="aspect-square rounded-md overflow-hidden border border-border hover:opacity-90 transition-opacity bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={url}
                    alt={`Flood report photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Crowdsourced Reports list */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
            <span>Community Reports ({tileReports.length})</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {tile.verifiedReports} verified • {tile.unverifiedReports} unverified
            </span>
          </div>

          {tileReports.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2 text-center italic bg-muted/20 rounded-md">
              No citizen reports submitted for this tile yet.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {tileReports.map((r) => (
                <div
                  key={r.id}
                  className="p-2 rounded-md border border-border/80 bg-background/60 space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-foreground">Water: {r.severityUser}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${
                        r.status === "Verified"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : r.status === "Dismissed"
                            ? "bg-muted text-muted-foreground"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {r.status === "Verified"
                        ? "✓ Verified"
                        : r.status === "Unverified"
                          ? "Unverified"
                          : "Dismissed"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{r.description}</p>
                  <div className="text-[9px] text-muted-foreground/75 text-right">
                    {timeAgo(r.createdAt, Date.now())}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t bg-muted/30 space-y-2 shrink-0">
        {/* Prominent Emergency Button for High/Critical Risk */}
        {isHighOrCritical && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onOpenPreparedness}
            className="w-full text-xs font-semibold gap-1.5 shadow-sm"
          >
            <LifeBuoy className="h-4 w-4" />
            <span>Emergency Guidance & Evacuation Shelters</span>
          </Button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onReportHere(tile.id)}
            className="text-xs px-2 gap-1"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Report</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRouteFrom(tile.id)}
            className="text-xs px-2 gap-1 border-border"
          >
            <Navigation className="h-3 w-3 text-emerald-600" />
            <span>From Here</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRouteTo(tile.id)}
            className="text-xs px-2 gap-1 border-border"
          >
            <Navigation className="h-3 w-3 text-route" />
            <span>Route To</span>
          </Button>
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-lg max-h-[80vh] overflow-hidden rounded-lg bg-background shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Close photo"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={selectedPhoto}
              alt="Flood Report Full View"
              className="max-h-[75vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
