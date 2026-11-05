import { useState, useMemo } from "react";
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
import { Search, Navigation, Building2, Droplets, HeartPulse, Accessibility, Dog, ExternalLink } from "lucide-react";
import type { Shelter } from "@/lib/flood/types";
import { getHaversineDistanceKm, formatDistanceString } from "@/lib/flood/sheltersDatabase";

interface NearbySheltersDrawerProps {
  open: boolean;
  onClose: () => void;
  shelters: Shelter[];
  referenceCoord: [number, number];
  onSelectShelter: (shelter: Shelter) => void;
  onPlanRoute: (shelter: Shelter) => void;
}

export default function NearbySheltersDrawer({
  open,
  onClose,
  shelters,
  referenceCoord,
  onSelectShelter,
  onPlanRoute,
}: NearbySheltersDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWater, setFilterWater] = useState(false);
  const [filterMedical, setFilterMedical] = useState(false);
  const [filterWheelchair, setFilterWheelchair] = useState(false);
  const [filterPets, setFilterPets] = useState(false);

  // Compute distance to referenceCoord and sort
  const sortedShelters = useMemo(() => {
    const list = shelters.map((s) => {
      const distanceKm = getHaversineDistanceKm(referenceCoord[0], referenceCoord[1], s.lat, s.lng);
      return {
        ...s,
        distanceKm,
        distanceLabel: formatDistanceString(distanceKm),
      };
    });

    list.sort((a, b) => a.distanceKm - b.distanceKm);

    return list.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesAddr = s.address.toLowerCase().includes(q);
        if (!matchesName && !matchesAddr) return false;
      }
      if (filterWater && !s.drinkingWater) return false;
      if (filterMedical && !s.medicalAid) return false;
      if (filterWheelchair && !s.wheelchairAccessible) return false;
      if (filterPets && !s.petFriendly) return false;
      return true;
    });
  }, [shelters, referenceCoord, searchQuery, filterWater, filterMedical, filterWheelchair, filterPets]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-5">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <DialogTitle className="text-lg font-bold">
              Emergency Shelter Directory ({sortedShelters.length})
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Verified official civic shelters, multi-purpose cyclone/flood centers, and disaster relief facilities.
          </DialogDescription>
        </DialogHeader>

        {/* SEARCH & FILTERS */}
        <div className="space-y-2 mt-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by facility name, city, or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button
              type="button"
              variant={filterWater ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterWater(!filterWater)}
              className="h-7 text-[10px] gap-1 rounded-full px-2.5"
            >
              <Droplets className="w-3 h-3 text-sky-500" />
              Drinking Water
            </Button>
            <Button
              type="button"
              variant={filterMedical ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMedical(!filterMedical)}
              className="h-7 text-[10px] gap-1 rounded-full px-2.5"
            >
              <HeartPulse className="w-3 h-3 text-rose-500" />
              Medical Aid
            </Button>
            <Button
              type="button"
              variant={filterWheelchair ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterWheelchair(!filterWheelchair)}
              className="h-7 text-[10px] gap-1 rounded-full px-2.5"
            >
              <Accessibility className="w-3 h-3 text-indigo-500" />
              Wheelchair Access
            </Button>
            <Button
              type="button"
              variant={filterPets ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPets(!filterPets)}
              className="h-7 text-[10px] gap-1 rounded-full px-2.5"
            >
              <Dog className="w-3 h-3 text-amber-500" />
              Pet Friendly
            </Button>
          </div>
        </div>

        {/* SHELTER LIST */}
        <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1">
          {sortedShelters.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No emergency shelters matched your search criteria in this region.
            </div>
          ) : (
            sortedShelters.slice(0, 30).map((sh) => (
              <div
                key={sh.id}
                className="p-3.5 rounded-2xl border bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground truncate">{sh.name}</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-primary/10 text-primary border-none shrink-0">
                      {sh.distanceLabel}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {sh.address}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {sh.capacityStatus || "Open"}
                    </span>
                    {sh.drinkingWater && (
                      <span className="text-[9px] bg-sky-500/10 text-sky-700 dark:text-sky-300 px-1.5 py-0.2 rounded font-medium">
                        💧 Water
                      </span>
                    )}
                    {sh.medicalAid && (
                      <span className="text-[9px] bg-rose-500/10 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded font-medium">
                        🏥 Medical
                      </span>
                    )}
                    {sh.wheelchairAccessible && (
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-medium">
                        ♿ Accessible
                      </span>
                    )}
                    {sh.petFriendly && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-medium">
                        🐕 Pet Friendly
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSelectShelter(sh);
                      onClose();
                    }}
                    className="h-8 text-xs flex-1 sm:flex-initial"
                  >
                    Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onPlanRoute(sh);
                      onClose();
                    }}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 flex-1 sm:flex-initial"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Route
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
