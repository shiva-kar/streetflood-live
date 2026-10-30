import { useState } from "react";
import {
  LifeBuoy,
  X,
  Phone,
  Home,
  Car,
  Users,
  CheckCircle2,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Building,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHECKLISTS, EMERGENCY_CONTACTS, SHELTERS } from "@/lib/flood/data";
import { sheltersByDistance } from "@/lib/flood/engine";
import { setState } from "@/lib/flood/store";
import type { AppState, RiskLevel, Shelter, Tile } from "@/lib/flood/types";

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

  if (!open) return null;

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prep-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 border-b bg-muted/40 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-destructive/10 text-destructive">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="prep-modal-title"
                className="font-display font-bold text-base text-foreground"
              >
                Emergency Preparedness & Evacuation
              </h2>
              <p className="text-xs text-muted-foreground">
                Actionable safety checklists, relief shelters & emergency helplines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close emergency modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Contextual Guidance Banner */}
        <div className="p-3 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive-foreground">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-foreground">
              {riskLevel === "Critical" ? (
                <>
                  <strong className="font-bold text-destructive">
                    CRITICAL FLOOD RISK IN AREA:
                  </strong>{" "}
                  Potentially dangerous water levels detected. Avoid all unnecessary travel. Move
                  vulnerable family members to upper floors or nearest relief shelter immediately.
                </>
              ) : (
                <>
                  <strong className="font-bold text-amber-600 dark:text-amber-400">
                    HIGH FLOOD RISK:
                  </strong>{" "}
                  Water accumulation likely on roads. Move vehicles to elevated parking, turn off
                  ground-floor power breakers if water enters, and keep essentials packed.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b bg-muted/20 px-3">
          <button
            type="button"
            onClick={() => setActiveTab("shelters")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "shelters"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Emergency Shelters ({nearbyShelters.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "contacts"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Emergency Contacts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checklists")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "checklists"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Safety Checklists</span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono">
              {checkedItems}/{totalItems}
            </Badge>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* TAB 1: SHELTERS */}
          {activeTab === "shelters" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Relief centers sorted by distance from current location:</span>
                <span className="text-[10px] italic">Simulated for demo</span>
              </div>

              <div className="space-y-2.5">
                {nearbyShelters.map((shelter) => (
                  <div
                    key={shelter.id}
                    className="p-3 rounded-lg border border-border bg-background space-y-1.5 shadow-2xs hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-primary" />
                          <h4 className="font-display font-bold text-sm text-foreground">
                            {shelter.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {shelter.address}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-xs text-foreground">
                          {shelter.distanceKm.toFixed(2)} km
                        </span>
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 border ${
                              shelter.capacityStatus === "Space available"
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                                : shelter.capacityStatus === "Filling up"
                                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                                  : "bg-red-500/15 text-red-800 dark:text-red-300 border-red-500/30"
                            }`}
                          >
                            {shelter.capacityStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground">
                        Type: <span className="font-medium text-foreground">{shelter.kind}</span>
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onHighlightShelter(shelter.id);
                          onClose();
                        }}
                        className="h-6 px-2 text-[11px] font-semibold gap-1 text-primary hover:text-primary"
                      >
                        <MapPin className="h-3 w-3" />
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
            <div className="space-y-3">
              <div className="text-[11px] text-muted-foreground">
                Official Indian emergency response helplines (tap to call):
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EMERGENCY_CONTACTS.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-border bg-background flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-foreground text-xs">{c.label}</div>
                      {c.note && <div className="text-[10px] text-muted-foreground">{c.note}</div>}
                    </div>
                    <a
                      href={`tel:${c.number}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-mono font-bold text-xs hover:bg-primary/90 transition-colors shadow-2xs shrink-0"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>{c.number}</span>
                    </a>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-md bg-muted/40 text-[11px] text-muted-foreground border">
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
              <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-lg border">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Preparedness Readiness</span>
                  <span className="font-mono font-bold text-primary">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Checklist Sub-tabs */}
              <div className="flex gap-1.5 border-b pb-2">
                {CHECKLISTS.map((c) => (
                  <button
                    type="button"
                    key={c.key}
                    onClick={() => setChecklistTab(c.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      checklistTab === c.key
                        ? "bg-secondary text-secondary-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {CHECKLISTS.find((c) => c.key === checklistTab)?.items.map((item, idx) => {
                  const isChecked = !!state.checklist?.[item];
                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                          : "bg-background border-border text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(item)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span
                        className={`text-xs ${isChecked ? "line-through text-muted-foreground" : ""}`}
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
        <div className="p-3 border-t bg-muted/40 flex items-center justify-between text-xs">
          <span className="text-[10px] text-muted-foreground">
            Preparedness state auto-saved locally in browser.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
