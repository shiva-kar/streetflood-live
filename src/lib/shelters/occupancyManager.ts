export interface ShelterOperations {
  id: string;
  totalCapacity: number;
  currentHeadcount: number;
  drinkingWaterLiters: number;
  mealPackets: number;
  generatorHours: number;
  pediatricFormulaUnits: number;
  physicianOnSite: boolean;
  wheelchairAccessible: boolean;
  petFriendly: boolean;
}

export function availableShelterCapacity(shelter: ShelterOperations) {
  return Math.max(0, shelter.totalCapacity - shelter.currentHeadcount);
}

export function allocateShelterBeds(shelter: ShelterOperations, requested: number) {
  if (!Number.isInteger(requested) || requested < 1) throw new Error("Requested shelter occupancy must be a positive integer.");
  const available = availableShelterCapacity(shelter);
  if (requested > available) throw new Error(`Shelter has only ${available} available places.`);
  return { ...shelter, currentHeadcount: shelter.currentHeadcount + requested };
}

export function shelterCanAccept(
  shelter: ShelterOperations,
  requirements: { wheelchair?: boolean; pets?: boolean; medical?: boolean; people: number },
) {
  return availableShelterCapacity(shelter) >= requirements.people
    && (!requirements.wheelchair || shelter.wheelchairAccessible)
    && (!requirements.pets || shelter.petFriendly)
    && (!requirements.medical || shelter.physicianOnSite);
}
