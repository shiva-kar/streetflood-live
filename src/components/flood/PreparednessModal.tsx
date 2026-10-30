import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LifeBuoy, X, Phone, Building, AlertTriangle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHECKLISTS, EMERGENCY_CONTACTS } from "@/lib/flood/data";
import { sheltersByDistance } from "@/lib/flood/engine";
import { setState } from "@/lib/flood/store";
import type { AppState, RiskLevel, Tile } from "@/lib/flood/types";

interface PreparednessModalProps {
  open: boolean;
  state: AppState;
  selectedTile: Tile | null;
  onClose: () => void;
  onHighlightShelter: (shelterId: string) => void;
}

export default function PreparednessModal({
  open,
  state,
  selectedTile,
  onClose,
  onHighlightShelter,
}: PreparednessModalProps) {
  const [activeTab, setActiveTab] = useState<"shelters" | "contacts" | "checklists">("shelters");
  const [checklistTab, setChecklistTab] = useState<string>("household");

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const currentLat = selectedTile?.centerLat ?? 19.05;
  const currentLng = selectedTile?.centerLng ?? 72.87;
  const nearbyShelters = sheltersByDistance(currentLat, currentLng);

  // Checklist counts
  const totalItems = CHECKLISTS.reduce((acc, c) => acc + c.items.length, 0);
  const checkedItems = Object.values(state.checklist || {}).filter(Boolean).length;
  const progressPercent = Math.round((checkedItems / (totalItems || 1)) * 100);

  const toggleCheck = (itemText: string) => {
    setState((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [itemText]: !prev.checklist?.[itemText],
      },
    }));
  };

  const riskLevel: RiskLevel = selectedTile?.currentRiskLevel || "High";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prep-modal-title"
      className="sf-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sf-modal-container w-full max-w-2xl my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="prep-modal-title"
                className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-100"
              >
                Emergency Preparedness & Evacuation
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Actionable safety checklists, relief shelters & emergency helplines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close emergency modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic Contextual Guidance Banner */}
        <div className="p-3.5 sm:p-4 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-800 text-xs sm:text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-slate-900 dark:text-slate-100">
              {riskLevel === "Critical" ? (
                <>
                  <strong className="font-bold text-red-600 dark:text-red-400">
                    CRITICAL FLOOD RISK IN AREA:
                  </strong>{" "}
                  Potentially dangerous water levels detected. Avoid all non-essential travel.
                  Prepare to move vulnerable family members to upper floors or nearest relief
                  shelter immediately.
                </>
              ) : (
                <>
                  <strong className="font-bold text-amber-600 dark:text-amber-400">
                    HIGH FLOOD RISK:
                  </strong>{" "}
                  Water accumulation likely on roads. Move vehicles to elevated ground, turn off
                  ground-floor circuit breakers if water enters, and keep essentials packed.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => setActiveTab("shelters")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === "shelters"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Relief Shelters ({nearbyShelters.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === "contacts"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Emergency Contacts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checklists")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "checklists"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>Safety Checklists</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 font-mono font-bold">
              {checkedItems}/{totalItems}
            </Badge>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm bg-white dark:bg-slate-900">
          {/* TAB 1: RELIEF SHELTERS */}
          {activeTab === "shelters" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
                <span>Relief centers sorted by distance from current location:</span>
                <span className="italic">Simulated for demo</span>
              </div>

              <div className="space-y-3">
                {nearbyShelters.map((shelter) => (
                  <div
                    key={shelter.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 shadow-xs hover:border-sky-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-sky-600" />
                          <h4 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                            {shelter.name}
                          </h4>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          {shelter.address}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          {shelter.distanceKm.toFixed(2)} km
                        </span>
                        <div className="mt-1">
                          <Badge
                            className={`text-xs px-2 py-0.5 font-bold ${
                              shelter.capacityStatus === "Space available"
                                ? "bg-emerald-600 text-white"
                                : shelter.capacityStatus === "Filling up"
                                  ? "bg-amber-500 text-slate-900"
                                  : "bg-red-600 text-white"
                            }`}
                          >
                            {shelter.capacityStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-500">
                        Facility:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {shelter.kind}
                        </strong>
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onHighlightShelter(shelter.id);
                          onClose();
                        }}
                        className="h-8 px-3 text-xs font-bold gap-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Locate on Map</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EMERGENCY CONTACTS */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-500">
                Official Indian emergency response helplines (tap to place a call):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EMERGENCY_CONTACTS.map((c, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {c.label}
                      </div>
                      {c.note && <div className="text-xs text-slate-500 mt-0.5">{c.note}</div>}
                    </div>
                    <a
                      href={`tel:${c.number}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-mono font-bold text-sm hover:bg-sky-700 transition-colors shadow-xs shrink-0"
                    >
                      <Phone className="h-4 w-4" />
                      <span>{c.number}</span>
                    </a>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-xs sm:text-sm text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                <strong>Important:</strong> Keep your mobile phone charged and store emergency
                numbers offline. In life-threatening emergencies, dial <strong>112</strong>{" "}
                immediately.
              </div>
            </div>
          )}

          {/* TAB 3: CHECKLISTS */}
          {activeTab === "checklists" && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Preparedness Readiness Progress
                  </span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {progressPercent}% Complete
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                {CHECKLISTS.map((c) => (
                  <button
                    type="button"
                    key={c.key}
                    onClick={() => setChecklistTab(c.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      checklistTab === c.key
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                {CHECKLISTS.find((c) => c.key === checklistTab)?.items.map((item, idx) => {
                  const isChecked = !!state.checklist?.[item];
                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-slate-100"
                          : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(item)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span
                        className={`text-sm ${
                          isChecked ? "line-through text-slate-400 dark:text-slate-500" : ""
                        }`}
                      >
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs text-slate-500">
          <span>Preparedness checklist state auto-persisted in local browser storage.</span>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-sm font-semibold border-slate-300 dark:border-slate-700"
          >
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
