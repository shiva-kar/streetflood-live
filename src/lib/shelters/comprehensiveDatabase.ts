import { COMPREHENSIVE_SHELTERS, formatDistanceString, getHaversineDistanceKm } from "@/lib/flood/sheltersDatabase";
import type { Shelter } from "@/lib/flood/types";

export interface ShelterFacility extends Shelter {
  totalCapacity: number;
  currentHeadcount: number;
  drinkingWaterLiters: number;
  mealPackets: number;
  generatorHours: number;
  pediatricFormulaUnits: number;
  physicianOnSite: boolean;
}

export const COMPREHENSIVE_FACILITIES: ShelterFacility[] = COMPREHENSIVE_SHELTERS.map((shelter, index) => ({
  ...shelter,
  totalCapacity: shelter.capacityStatus === "Near capacity" ? 80 : shelter.capacityStatus === "Filling up" ? 120 : 180,
  currentHeadcount: shelter.capacityStatus === "Near capacity" ? 70 : shelter.capacityStatus === "Filling up" ? 45 : 0,
  drinkingWaterLiters: shelter.drinkingWater ? 1000 : 0,
  mealPackets: shelter.capacityStatus === "Near capacity" ? 40 : 100,
  generatorHours: index % 3 === 0 ? 12 : 6,
  pediatricFormulaUnits: index % 4 === 0 ? 24 : 0,
  physicianOnSite: shelter.medicalAid ?? false,
}));

export function findNearestOperationalShelters(
  lat: number,
  lng: number,
  limit = 5,
  requirements: Partial<Pick<Shelter, "drinkingWater" | "medicalAid" | "wheelchairAccessible" | "petFriendly">> = {},
) {
  return COMPREHENSIVE_FACILITIES
    .filter((shelter) => Object.entries(requirements).every(([key, required]) => !required || shelter[key as keyof Shelter] === true))
    .map((shelter) => {
      const distanceKm = getHaversineDistanceKm(lat, lng, shelter.lat, shelter.lng);
      return { ...shelter, distanceKm, distanceLabel: formatDistanceString(distanceKm) };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
