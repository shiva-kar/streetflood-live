import { useState } from "react";
import {
  X,
  Clock,
  Camera,
  Navigation,
  LifeBuoy,
  ShieldAlert,
  Sparkles,
  PlusCircle,
  Cpu,
  Droplets,
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

const RISK_CONFIG: Record<string, { bg: string; text: string; badgeClass: string; label: string }> =
  {
    Low: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-300",
      badgeClass: "bg-emerald-600 text-white",
      label: "Normal conditions • Safe to pass",
    },
    Moderate: {
      bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      badgeClass: "bg-amber-500 text-slate-900 font-bold",
      label: "Water pooling on sides • Slow traffic",
    },
    High: {
      bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-300",
      badgeClass: "bg-orange-600 text-white font-bold",
      label: "Significant waterlogging • 2-wheelers stalling",
    },
    Critical: {
      bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-300",
      badgeClass: "bg-red-600 text-white font-bold",
      label: "Severe inundation • Impassable / Dangerous",
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
  const config = RISK_CONFIG[tile.currentRiskLevel] || RISK_CONFIG.Low;
  const isHighOrCritical = tile.currentRiskLevel === "High" || tile.currentRiskLevel === "Critical";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-start justify-between gap-3 shrink-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Block {tile.row + 1}
              {String.fromCharCode(65 + (tile.col % 26))} • {tile.ward.toUpperCase()} WARD
            </span>
            {tile.isHotspot && (
              <Badge className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 text-[11px] font-bold px-2 py-0">
                Known Hotspot
              </Badge>
            )}
          </div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-100 truncate">
            {tile.locality}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
          aria-label="Close details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Severity Banner Card */}
        <div className={`rounded-xl border p-4 ${config.bg} space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Current Flood Severity Score
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>{timeAgo(tile.lastUpdated, Date.now())}</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-slate-900 dark:text-slate-100">
                {tile.currentSeverityScore}
              </span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                / 100
              </span>
            </div>
            <Badge className={`text-sm px-3 py-1 font-bold ${config.badgeClass}`}>
              {tile.currentRiskLevel} Risk
            </Badge>
          </div>

          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{config.label}</p>
        </div>

        {/* Severity Calculation Point Breakdown */}
        {tile.severityBreakdown.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Score Calculation Breakdown
              </span>
              <span className="text-xs text-slate-500">Official weighted formula</span>
            </div>
            <ul className="space-y-1.5 pt-1">
              {tile.severityBreakdown.map((item, idx) => {
                const parts = item.split(":");
                return (
                  <li
                    key={idx}
                    className="flex items-center justify-between text-xs sm:text-sm text-slate-600 dark:text-slate-400"
                  >
                    <span>• {parts[0]}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {parts[1] || ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Official Road Incident Warning if any */}
        {incident && (
          <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-sm text-red-950 dark:text-red-200">
                Official Road Incident: {incident.status}
              </div>
              <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 leading-snug">
                {incident.description}
              </p>
            </div>
          </div>
        )}

        {/* 3-Hour Predictive Flood Risk Card (Feature 6) */}
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm sm:text-base">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>3-Hour Predictive Early Warning</span>
            </div>
            <Badge
              variant="outline"
              className={`text-xs px-2.5 py-0.5 font-bold ${
                tile.predictedRisk === "Moderate"
                  ? "bg-amber-500 text-slate-900 border-amber-600"
                  : "bg-emerald-600 text-white border-emerald-700"
              }`}
            >
              Predicted: {tile.predictedRisk} Risk
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-sky-500 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  3h Rain Forecast
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {tile.forecastRainfallNext3Hours.toFixed(0)} mm
                </div>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-slate-500 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  Drainage Capacity
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {tile.drainageScore.toFixed(0)}/100
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="text-xs font-bold text-amber-950 dark:text-amber-300">
              Rule-Based Risk Factors:
            </div>
            <ul className="space-y-1">
              {tile.predictionReasons.map((reason, i) => (
                <li
                  key={i}
                  className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"
                >
                  <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-amber-200 dark:border-amber-800/60">
            Simulated rule-based prediction for demonstration. Not for life-safety emergency
            decisions.
          </p>
        </div>

        {/* Ultrasonic Water-Level Sensor Telemetry */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                Low-Cost Curb Depth Sensor
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Telemetry:{" "}
                {tile.sensorLevel > 0
                  ? `Level ${tile.sensorLevel}/4 (~${tile.sensorLevel * 10} cm water)`
                  : "Dry / No accumulation"}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-bold px-2 py-0.5">
            Level {tile.sensorLevel}
          </Badge>
        </div>

        {/* Crowdsourced Photo Evidence Gallery */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Camera className="h-4 w-4 text-slate-500" />
              <span>Crowdsourced Photos ({photos.length})</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSelectedPhoto(url)}
                  className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity bg-slate-100 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-xs"
                >
                  <img
                    src={url}
                    alt={`Report photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Community Reports List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            <span>Community Reports ({tileReports.length})</span>
            <span className="text-xs text-slate-500 font-normal">
              {tile.verifiedReports} verified • {tile.unverifiedReports} unverified
            </span>
          </div>

          {tileReports.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-500 py-3 text-center italic bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
              No citizen reports submitted for this tile yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {tileReports.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 space-y-1 shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Water: {r.severityUser}
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
                      {r.status === "Verified"
                        ? "✓ Verified"
                        : r.status === "Unverified"
                          ? "Unverified"
                          : "Dismissed"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                    {r.description}
                  </p>
                  <div className="text-[10px] text-slate-400 text-right">
                    {timeAgo(r.createdAt, Date.now())}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2.5 shrink-0">
        {/* Prominent Emergency Button for High/Critical Risk */}
        {isHighOrCritical && (
          <Button
            type="button"
            variant="destructive"
            onClick={onOpenPreparedness}
            className="w-full h-10 font-bold text-sm gap-2 shadow-sm bg-red-600 hover:bg-red-700"
          >
            <LifeBuoy className="h-4 w-4" />
            <span>Emergency Guidance & Evacuation Shelters</span>
          </Button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => onReportHere(tile.id)}
            className="h-9 text-xs sm:text-sm font-semibold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Report</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onRouteFrom(tile.id)}
            className="h-9 text-xs sm:text-sm font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
          >
            <Navigation className="h-4 w-4 text-emerald-600" />
            <span>From Here</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onRouteTo(tile.id)}
            className="h-9 text-xs sm:text-sm font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
          >
            <Navigation className="h-4 w-4 text-indigo-600" />
            <span>Route To</span>
          </Button>
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="sf-modal-backdrop"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] overflow-hidden rounded-xl bg-slate-900 p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Close photo preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedPhoto}
              alt="Evidence Full View"
              className="max-h-[80vh] w-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
