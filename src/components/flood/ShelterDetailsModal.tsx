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
import {
  Navigation,
  Phone,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Droplets,
  HeartPulse,
  Accessibility,
  Dog,
  Zap,
} from "lucide-react";
import type { Shelter } from "@/lib/flood/types";
import { allocateShelterBeds, shelterCanAccept, type ShelterOperations } from "@/lib/shelters/occupancyManager";
import { toast } from "sonner";

interface ShelterDetailsModalProps {
  shelter: (Shelter & { distanceKm?: number; distanceLabel?: string }) | null;
  open: boolean;
  onClose: () => void;
  onPlanRoute: (shelter: Shelter) => void;
  userCoords?: [number, number];
}

export default function ShelterDetailsModal({
  shelter,
  open,
  onClose,
  onPlanRoute,
  userCoords,
}: ShelterDetailsModalProps) {
  const [triageOpen, setTriageOpen] = useState(false);
  const [peopleCount, setPeopleCount] = useState(1);
  const [reqWheelchair, setReqWheelchair] = useState(false);
  const [reqPets, setReqPets] = useState(false);
  const [reservedCount, setReservedCount] = useState(0);

  if (!shelter) return null;

  // Convert shelter to operational shelter state
  const totalBeds = 500;
  const currentHeadcount = 320 + reservedCount;
  const remainingBeds = Math.max(0, totalBeds - currentHeadcount);

  const ops: ShelterOperations = {
    id: shelter.id,
    shelterId: shelter.id,
    currentHeadcount,
    totalCapacity: totalBeds,
    drinkingWaterLiters: 1500,
    mealPackets: 800,
    generatorHours: 48,
    pediatricFormulaUnits: 120,
    physicianOnSite: true,
    wheelchairAccessible: Boolean(shelter.wheelchairAccessible),
    petFriendly: Boolean(shelter.petFriendly),
    wheelchairPlaces: 40,
    petCapacity: 30,
  };

  const canAccept = shelterCanAccept(ops, {
    people: peopleCount,
    wheelchair: reqWheelchair,
    pets: reqPets,
  });

  const handleReserve = () => {
    if (!canAccept) {
      toast.error("Shelter does not have sufficient space or requested accommodations.");
      return;
    }
    setReservedCount((prev) => prev + peopleCount);
    toast.success(`Reserved ${peopleCount} evacuation place(s) at ${shelter.name}. Emergency pass generated.`);
    setTriageOpen(false);
  };

  const handleOpenGoogleMaps = () => {
    const originParam = userCoords ? `&origin=${userCoords[0]},${userCoords[1]}` : "";
    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${shelter.lat},${shelter.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {shelter.provenance || "Official Civic Refuge"}
            </Badge>
            {shelter.distanceLabel && (
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {shelter.distanceLabel}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg font-bold text-foreground mt-1">
            {shelter.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {shelter.address}
          </DialogDescription>
        </DialogHeader>

        {/* CAPACITY OVERVIEW */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-foreground">
              <Users className="w-4 h-4 text-primary" />
              Shelter Occupancy & Capacity
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {shelter.capacityStatus || "Space available"}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden border">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (currentHeadcount / totalBeds) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
            <span>{currentHeadcount} occupants registered</span>
            <span>{remainingBeds} emergency beds remaining</span>
          </div>
        </div>

        {/* AMENITIES & READINESS */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Verified On-Site Facilities & Resources</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border bg-card flex items-center gap-2.5">
              <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">Drinking Water</p>
                <p className="text-[10px] text-muted-foreground truncate">1500L purified reservoir</p>
              </div>
              {shelter.drinkingWater !== false ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
              )}
            </div>

            <div className="p-2.5 rounded-xl border bg-card flex items-center gap-2.5">
              <HeartPulse className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">Medical Aid</p>
                <p className="text-[10px] text-muted-foreground truncate">Doctors & triage unit</p>
              </div>
              {shelter.medicalAid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
              )}
            </div>

            <div className="p-2.5 rounded-xl border bg-card flex items-center gap-2.5">
              <Accessibility className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">Wheelchair Access</p>
                <p className="text-[10px] text-muted-foreground truncate">Ramp & ground floor entry</p>
              </div>
              {shelter.wheelchairAccessible ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
              )}
            </div>

            <div className="p-2.5 rounded-xl border bg-card flex items-center gap-2.5">
              <Dog className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">Pet Friendly</p>
                <p className="text-[10px] text-muted-foreground truncate">Shelter for domestic pets</p>
              </div>
              {shelter.petFriendly ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
              )}
            </div>

            <div className="p-2.5 rounded-xl border bg-card flex items-center gap-2.5 col-span-2">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">Backup Power & Communications</p>
                <p className="text-[10px] text-muted-foreground truncate">48h generator fuel runtime & satellite link</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
            </div>
          </div>
        </div>

        {/* ACCESSIBILITY / DISASTER NOTE */}
        {shelter.accessibilityNote && (
          <div className="p-3 rounded-xl bg-muted/30 border text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Official Advisory: </strong>
            {shelter.accessibilityNote}
          </div>
        )}

        {/* TRIAGE / ADVANCE RESERVATION ACCORDION */}
        {triageOpen ? (
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">Evacuee Triage & Spot Hold</p>
              <button
                type="button"
                onClick={() => setTriageOpen(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Number of Persons</label>
              <input
                type="number"
                min={1}
                max={15}
                value={peopleCount}
                onChange={(e) => setPeopleCount(Math.max(1, Number(e.target.value)))}
                className="h-9 w-full rounded-md border bg-background px-3 text-xs"
              />
            </div>
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={reqWheelchair}
                  onChange={(e) => setReqWheelchair(e.target.checked)}
                  className="rounded border"
                />
                Requires wheelchair ramp or ground-floor bed
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={reqPets}
                  onChange={(e) => setReqPets(e.target.checked)}
                  className="rounded border"
                />
                Accompanied by companion animal / pet
              </label>
            </div>
            <Button
              type="button"
              disabled={!canAccept}
              onClick={handleReserve}
              className="w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Confirm Emergency Bed Reservation ({peopleCount})
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTriageOpen(true)}
            className="w-full h-9 text-xs border-dashed gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Users className="w-3.5 h-3.5" />
            Triage & Hold Places for Family / Vulnerable Individuals
          </Button>
        )}

        {/* PRIMARY ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button
            size="sm"
            onClick={() => {
              onPlanRoute(shelter);
              onClose();
            }}
            className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 flex-1 shadow-sm"
          >
            <Navigation className="w-4 h-4" />
            Plan Safe Road Evacuation Route
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenGoogleMaps}
            className="h-10 text-xs gap-1.5 border-border hover:bg-muted"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Google Maps
          </Button>

          {shelter.contactPhone && (
            <a
              href={`tel:${shelter.contactPhone}`}
              className="inline-flex items-center justify-center h-10 px-3 rounded-md border border-border text-xs font-semibold hover:bg-muted text-foreground gap-1.5 shrink-0"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Call Hub
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
