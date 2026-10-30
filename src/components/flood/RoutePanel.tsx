import { useState, useEffect } from "react";
import {
  Navigation,
  ArrowUpDown,
  Clock,
  Compass,
  ShieldCheck,
  AlertTriangle,
  X,
  MapPin,
  MousePointerClick,
  LifeBuoy,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  FloodReport,
  RoadIncident,
  RoadRouteResult,
  Shelter,
  ShelterCandidate,
  Tile,
} from "@/lib/flood/types";

interface RoutePanelProps {
  tiles: Tile[];
  shelters: Shelter[];
  reports: FloodReport[];
  incidents: RoadIncident[];
  roadRoute: RoadRouteResult | null;
  shelterCandidates: ShelterCandidate[];
  selectedShelterId: string | null;
  fromId: string | null;
  toId: string | null;
  navMode: "evacuate" | "custom";
  pickMode: boolean;
  isLoading?: boolean;
  onNavModeChange: (mode: "evacuate" | "custom") => void;
  onSelectFrom: (tileId: string) => void;
  onSelectTo: (tileId: string) => void;
  onSelectShelter: (shelterId: string) => void;
  onCalculateRoadRoute: (fromId: string, toId: string) => void;
  onEvacuateToShelter: (fromId: string, shelterId?: string) => void;
  onClearRoute: () => void;
  onTogglePickMode: () => void;
  onClose: () => void;
  onOpenPreparedness: () => void;
}

const PRESET_LOCATIONS = [
  { id: "t_2_4", label: "Sion Hospital / Circle (Sion)", row: 2, col: 4 },
  { id: "t_20_16", label: "Kurla West Station / LBS Marg", row: 20, col: 16 },
  { id: "t_6_17", label: "Chunabhatti Bus Stand (East)", row: 6, col: 17 },
  { id: "t_15_1", label: "Mithi River Edge (SW Ward)", row: 15, col: 1 },
  { id: "t_18_14", label: "LBS Marg Junction (Kurla)", row: 18, col: 14 },
  { id: "t_10_12", label: "Sion–Kurla Link Road", row: 10, col: 12 },
];

export default function RoutePanel({
  tiles,
  shelters,
  reports,
  incidents,
  roadRoute,
  shelterCandidates,
  selectedShelterId,
  fromId,
  toId,
  navMode,
  pickMode,
  isLoading,
  onNavModeChange,
  onSelectFrom,
  onSelectTo,
  onSelectShelter,
  onCalculateRoadRoute,
  onEvacuateToShelter,
  onClearRoute,
  onTogglePickMode,
  onClose,
  onOpenPreparedness,
}: RoutePanelProps) {
  const [internalFrom, setInternalFrom] = useState(fromId || "t_2_4");
  const [internalTo, setInternalTo] = useState(toId || "t_20_16");
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (fromId) setInternalFrom(fromId);
  }, [fromId]);

  useEffect(() => {
    if (toId) setInternalTo(toId);
  }, [toId]);

  const originTile = tiles.find((t) => t.id === internalFrom);
  const destTile = tiles.find((t) => t.id === internalTo);

  const originRisk = originTile?.currentRiskLevel || "Low";
  const destRisk = destTile?.currentRiskLevel || "Low";

  const handleSwap = () => {
    const tmp = internalFrom;
    setInternalFrom(internalTo);
    setInternalTo(tmp);
    onSelectFrom(internalTo);
    onSelectTo(tmp);
    onCalculateRoadRoute(internalTo, tmp);
  };

  const handleRunCustomRoute = () => {
    if (!internalFrom || !internalTo) return;
    onSelectFrom(internalFrom);
    onSelectTo(internalTo);
    onCalculateRoadRoute(internalFrom, internalTo);
  };

  const recommendedShelterCandidate = shelterCandidates.find((c) => c.isRecommended);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-sky-600 text-white font-bold shadow-xs">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
              Road-Based Safe Navigation
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Street-network routing with live flood risk intelligence
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close route panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Mode Switcher: Evacuation Mode (Default) vs Custom Destination */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg gap-1">
          <button
            type="button"
            onClick={() => {
              onNavModeChange("evacuate");
              onEvacuateToShelter(internalFrom);
            }}
            className={`py-1.5 px-3 rounded-md text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              navMode === "evacuate"
                ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <LifeBuoy className="h-4 w-4" />
            <span>Evacuate to Shelter</span>
          </button>

          <button
            type="button"
            onClick={() => onNavModeChange("custom")}
            className={`py-1.5 px-3 rounded-md text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              navMode === "custom"
                ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>Custom Destination</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Origin Selection */}
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" />
              Origin (Starting Point)
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Risk: <span className="font-bold">{originRisk}</span>
            </span>
          </label>
          <div className="flex items-center gap-2">
            <select
              value={internalFrom}
              onChange={(e) => {
                const val = e.target.value;
                setInternalFrom(val);
                onSelectFrom(val);
                if (navMode === "evacuate") {
                  onEvacuateToShelter(val, selectedShelterId || undefined);
                }
              }}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500"
            >
              {tiles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.locality} ({t.currentRiskLevel} risk)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onTogglePickMode}
              title="Pick origin on map"
              className={`p-2 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${
                pickMode
                  ? "bg-sky-600 text-white border-sky-600"
                  : "border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <MousePointerClick className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Origin Risk Warnings (Section 3) */}
        {originRisk === "Critical" && (
          <div className="p-3.5 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 space-y-2">
            <div className="flex items-start gap-2.5 text-red-950 dark:text-red-200">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <strong>CRITICAL FLOOD RISK AT ORIGIN:</strong> Severe inundation in your immediate
                area. Do not attempt to walk or drive through flood waters. If trapped or in
                immediate danger, call emergency rescue immediately.
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={onOpenPreparedness}
                className="h-8 text-xs font-bold gap-1.5 bg-red-600 hover:bg-red-700"
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                <span>Emergency Help</span>
              </Button>
              <a
                href="tel:112"
                className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span>Dial 112</span>
              </a>
            </div>
          </div>
        )}

        {originRisk === "High" && (
          <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 flex items-start gap-2 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Evacuation Advisory:</strong> High water accumulation active near your
              starting location. Move vehicles to higher elevation and evacuate via recommended
              routes now.
            </span>
          </div>
        )}

        {/* MODE A: EVACUATION TO SHELTER (DEFAULT) */}
        {navMode === "evacuate" && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Eligible Relief Shelters
              </span>
              <span className="text-[11px] text-slate-400">Road routes evaluated</span>
            </div>

            {/* Recommended Shelter Card */}
            {recommendedShelterCandidate && (
              <div className="rounded-xl border-2 border-sky-500 dark:border-sky-600 bg-sky-50/60 dark:bg-sky-950/30 p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Badge className="bg-sky-600 text-white text-[10px] font-bold px-2 py-0 mb-1">
                      ★ Recommended Safest Shelter
                    </Badge>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                      {recommendedShelterCandidate.shelter.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {recommendedShelterCandidate.shelter.address}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold shrink-0 bg-white/80 dark:bg-slate-800"
                  >
                    {recommendedShelterCandidate.shelter.capacityStatus}
                  </Badge>
                </div>

                {/* Provenance note */}
                <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                  Note:{" "}
                  {recommendedShelterCandidate.shelter.provenance ||
                    "Simulated Demonstration Shelter"}
                  . Confirm operational status with local authorities.
                </div>

                {/* Road Route Metrics */}
                {recommendedShelterCandidate.route && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-200 dark:border-sky-800/60 font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-sky-600" />~
                      {recommendedShelterCandidate.route.durationMinutes} mins (
                      {recommendedShelterCandidate.route.distanceKm.toFixed(1)} km road route)
                    </span>
                    <Badge
                      className={`text-[10px] px-2 py-0 ${
                        recommendedShelterCandidate.route.safetyStatus === "Safe"
                          ? "bg-emerald-600 text-white"
                          : recommendedShelterCandidate.route.safetyStatus === "Caution"
                            ? "bg-amber-500 text-slate-900"
                            : "bg-red-600 text-white"
                      }`}
                    >
                      {recommendedShelterCandidate.route.safetyStatus === "Safe"
                        ? "✓ Safe Route"
                        : recommendedShelterCandidate.route.safetyStatus === "Caution"
                          ? "⚠️ Caution Route"
                          : "Impassable"}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Other Shelters List */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Alternative Shelter Destinations:
              </span>
              <div className="space-y-2">
                {shelterCandidates
                  .filter((c) => !c.isRecommended)
                  .map((cand) => {
                    const isSelected = selectedShelterId === cand.shelter.id;
                    return (
                      <button
                        type="button"
                        key={cand.shelter.id}
                        onClick={() => {
                          onSelectShelter(cand.shelter.id);
                          onEvacuateToShelter(internalFrom, cand.shelter.id);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {cand.shelter.name}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                            {cand.route ? `${cand.route.distanceKm.toFixed(1)} km` : "..."}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span>{cand.shelter.address}</span>
                          <span
                            className={
                              cand.route?.safetyStatus === "Impassable"
                                ? "text-red-600 font-bold"
                                : cand.route?.safetyStatus === "Caution"
                                  ? "text-amber-600 font-medium"
                                  : "text-emerald-600 font-medium"
                            }
                          >
                            {cand.route?.safetyStatus === "Impassable"
                              ? "Blocked / Impassable"
                              : cand.route?.safetyStatus === "Caution"
                                ? "Caution Route"
                                : "Safe Route"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* MODE B: CUSTOM DESTINATION */}
        {navMode === "custom" && (
          <div className="space-y-3 pt-1">
            {/* Swap Controls */}
            <div className="flex items-center justify-between py-0.5">
              <button
                type="button"
                onClick={handleSwap}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-semibold px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>Swap Origin / Destination</span>
              </button>

              <button
                type="button"
                onClick={onTogglePickMode}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                  pickMode
                    ? "bg-sky-600 text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <MousePointerClick className="h-3.5 w-3.5" />
                <span>{pickMode ? "Click Map..." : "Pick on Map"}</span>
              </button>
            </div>

            {/* Destination Selection */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-xs" />
                  Destination Point (B)
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Risk: <span className="font-bold">{destRisk}</span>
                </span>
              </label>
              <select
                value={internalTo}
                onChange={(e) => {
                  setInternalTo(e.target.value);
                  onSelectTo(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500"
              >
                {tiles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.locality} ({t.currentRiskLevel} risk)
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Risk Warning */}
            {(destRisk === "High" || destRisk === "Critical") && (
              <div className="p-3 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-xs sm:text-sm text-red-900 dark:text-red-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span>DANGEROUS DESTINATION WARNING</span>
                </div>
                <p>
                  Your selected destination is located in a{" "}
                  <strong>{destRisk} Risk flood zone</strong>. Travelling toward flooded blocks is
                  hazardous. We recommend evacuating to a designated shelter instead.
                </p>
              </div>
            )}

            {/* Calculate Button */}
            <Button
              type="button"
              disabled={isLoading}
              onClick={handleRunCustomRoute}
              className="w-full h-10 font-bold text-sm gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Compass className="h-4 w-4" />
              <span>{isLoading ? "Calculating Road Route..." : "Calculate Road Route"}</span>
            </Button>

            {/* Popular Landmarks */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick Landmark Destinations:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_LOCATIONS.map((lm) => (
                  <button
                    type="button"
                    key={lm.id}
                    onClick={() => {
                      setInternalTo(lm.id);
                      onSelectTo(lm.id);
                      onCalculateRoadRoute(internalFrom, lm.id);
                    }}
                    className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {lm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ROUTE CALCULATION RESULT DISPLAY */}
        {roadRoute ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3.5 mt-2 animate-in fade-in duration-200">
            {/* Header: Distance, Duration, Status Badge */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Road Navigation Metric (
                  {roadRoute.provider === "OSRM" ? "OpenStreetMap OSRM" : "Corridor Network"})
                </span>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="font-display font-extrabold text-2xl text-slate-900 dark:text-slate-100">
                    {roadRoute.distanceKm.toFixed(1)} km
                  </span>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="h-4 w-4" />~{roadRoute.durationMinutes} mins
                  </span>
                </div>
              </div>

              <Badge
                className={`text-xs px-3 py-1 font-bold ${
                  roadRoute.safetyStatus === "Safe"
                    ? "bg-emerald-600 text-white"
                    : roadRoute.safetyStatus === "Caution"
                      ? "bg-amber-500 text-slate-900"
                      : roadRoute.safetyStatus === "HighRisk"
                        ? "bg-orange-600 text-white"
                        : "bg-red-600 text-white"
                }`}
              >
                {roadRoute.safetyStatus === "Safe"
                  ? "✓ Safe Road Route"
                  : roadRoute.safetyStatus === "Caution"
                    ? "⚠️ Caution Route"
                    : roadRoute.safetyStatus === "HighRisk"
                      ? "⚠️ High Risk Route"
                      : "⛔ IMPASSABLE"}
              </Badge>
            </div>

            {/* Impassable Alert Notice (Section 3) */}
            {roadRoute.safetyStatus === "Impassable" && (
              <div className="p-3.5 rounded-lg border-2 border-red-500 bg-red-100/80 dark:bg-red-950/60 text-red-950 dark:text-red-200 space-y-2">
                <div className="font-extrabold text-sm flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                  <span>NO SUFFICIENTLY SAFE ROUTE FOUND</span>
                </div>
                <p className="text-xs leading-relaxed">{roadRoute.safetyMessage}</p>
                <div className="text-[11px] text-red-800 dark:text-red-300 font-medium pt-1 border-t border-red-200 dark:border-red-900">
                  Emergency Advice: Avoid traveling along this corridor. Stay on high ground. If
                  water is rising or assistance is required, call <strong>112</strong> immediately.
                </div>
              </div>
            )}

            {/* Passable Route Guidance */}
            {roadRoute.safetyStatus !== "Impassable" && (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                {roadRoute.safetyMessage}
              </p>
            )}

            {/* Traversed Road Risk Tiers */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Road Geometry Risk Exposure:
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-xs">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <div className="font-bold text-sm">{roadRoute.counts.Low}</div>
                  <div className="text-[10px] font-sans font-medium">Low</div>
                </div>
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <div className="font-bold text-sm">{roadRoute.counts.Moderate}</div>
                  <div className="text-[10px] font-sans font-medium">Mod</div>
                </div>
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                  <div className="font-bold text-sm">{roadRoute.counts.High}</div>
                  <div className="text-[10px] font-sans font-medium">High</div>
                </div>
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
                  <div className="font-bold text-sm">{roadRoute.counts.Critical}</div>
                  <div className="text-[10px] font-sans font-medium">Critical</div>
                </div>
              </div>
            </div>

            {/* Warnings list if any */}
            {roadRoute.dangerWarnings.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Detected Hazard Checkpoints:
                </div>
                <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
                  {roadRoute.dangerWarnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Turn-by-Turn Navigation Steps Toggle */}
            {roadRoute.steps.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowSteps(!showSteps)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 transition-colors"
                >
                  <span>Turn-by-Turn Street Directions ({roadRoute.steps.length} steps)</span>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${showSteps ? "rotate-90" : ""}`}
                  />
                </button>

                {showSteps && (
                  <ol className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-2 max-h-48 overflow-y-auto">
                    {roadRoute.steps.map((st, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 border-l-2 border-sky-400 pl-2 py-0.5"
                      >
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {i + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {st.instruction}
                          </div>
                          {st.distanceMeters > 0 && (
                            <div className="text-[10px] text-slate-400">
                              {st.distanceMeters} m • ~{Math.round(st.durationSeconds)}s
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClearRoute}
                className="w-full text-xs font-semibold"
              >
                Clear Route
              </Button>
            </div>

            <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200 dark:border-slate-700">
              Road geometry via OpenStreetMap & OSRM. Real-time flood hazard intelligence computed
              by StreetFlood.
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 text-xs sm:text-sm">
            {navMode === "evacuate"
              ? "Select your origin above to view the safest road-following evacuation route."
              : "Select origin and destination above, then click Calculate Road Route."}
          </div>
        )}
      </div>
    </div>
  );
}
