export interface ShelterOperations {
  id: string;
  shelterId?: string;
  totalCapacity: number;
  currentHeadcount: number;
  drinkingWaterLiters: number;
  mealPackets: number;
  generatorHours: number;
  pediatricFormulaUnits: number;
  physicianOnSite: boolean;
  wheelchairAccessible: boolean;
  petFriendly: boolean;
  wheelchairPlaces?: number;
  petCapacity?: number;
}

export function availableShelterCapacity(shelter: ShelterOperations) {
  return Math.max(0, shelter.totalCapacity - shelter.currentHeadcount);
}

export function allocateShelterBeds(shelter: ShelterOperations, requested: number) {
  if (!Number.isInteger(requested) || requested < 1) throw new Error("Requested shelter occupancy must be a positive integer.");
  const available = availableShelterCapacity(shelter);
  if (requested > available) throw new Error("Insufficient shelter capacity.");
  return {
    ...shelter,
    currentHeadcount: shelter.currentHeadcount + requested,
  };
}

export function shelterCanAccept(
  shelter: ShelterOperations,
  requirements: {
    people: number;
    requiresWheelchair?: boolean;
    wheelchair?: boolean;
    hasPets?: boolean;
    pets?: boolean;
    medical?: boolean;
    requiresMedical?: boolean;
  }
) {
  const needsWheelchair = Boolean(requirements.requiresWheelchair || requirements.wheelchair);
  const needsPets = Boolean(requirements.hasPets || requirements.pets);
  const needsMedical = Boolean(requirements.medical || requirements.requiresMedical);

  if (availableShelterCapacity(shelter) < requirements.people) return false;
  if (needsWheelchair && !shelter.wheelchairAccessible) return false;
  if (needsPets && !shelter.petFriendly) return false;
  if (needsMedical && !shelter.physicianOnSite) return false;
  return true;
}
