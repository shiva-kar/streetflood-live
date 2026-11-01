export interface RunoffInput {
  rainfallMmPerHour: number;
  areaSquareMeters: number;
  imperviousFraction: number;
  soilPermeability: number;
  slopeDegrees?: number;
}

export interface RunoffResult {
  runoffCoefficient: number;
  dischargeCubicMetersPerSecond: number;
  dischargeLitersPerSecond: number;
  rainfallIntensityMmPerHour: number;
  infiltrationMmPerHour: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function runoffCoefficient(imperviousFraction: number, soilPermeability: number, slopeDegrees = 0) {
  const impervious = clamp(imperviousFraction, 0, 1);
  const permeability = clamp(soilPermeability, 0, 1);
  const slopeFactor = clamp(slopeDegrees / 45, 0, 1) * 0.08;
  return clamp(0.2 * (1 - impervious) + 0.85 * impervious + slopeFactor - permeability * 0.12, 0.05, 0.98);
}

/** Rational method: Q = C * I * A, converted from mm/h to m³/s. */
export function calculateRunoff(input: RunoffInput): RunoffResult {
  if (!Number.isFinite(input.rainfallMmPerHour) || input.rainfallMmPerHour < 0) {
    throw new Error("Rainfall intensity cannot be negative.");
  }
  if (!Number.isFinite(input.areaSquareMeters) || input.areaSquareMeters <= 0) {
    throw new Error("Catchment area must be positive.");
  }
  const coefficient = runoffCoefficient(input.imperviousFraction, input.soilPermeability, input.slopeDegrees);
  const infiltration = Math.min(input.rainfallMmPerHour, 8 * clamp(input.soilPermeability, 0, 1));
  const effectiveRainfall = Math.max(0, input.rainfallMmPerHour - infiltration);
  const discharge = (coefficient * effectiveRainfall * input.areaSquareMeters) / 3_600_000;
  return {
    runoffCoefficient: coefficient,
    dischargeCubicMetersPerSecond: discharge,
    dischargeLitersPerSecond: discharge * 1000,
    rainfallIntensityMmPerHour: input.rainfallMmPerHour,
    infiltrationMmPerHour: infiltration,
  };
}

export function calculateTileRunoff(
  rainfallMmPerHour: number,
  imperviousFraction: number,
  soilPermeability: number,
  slopeDegrees = 0,
) {
  return calculateRunoff({
    rainfallMmPerHour,
    areaSquareMeters: 100,
    imperviousFraction,
    soilPermeability,
    slopeDegrees,
  });
}

export function accumulateCatchmentRunoff(results: RunoffResult[]) {
  return results.reduce(
    (total, result) => ({
      dischargeCubicMetersPerSecond: total.dischargeCubicMetersPerSecond + result.dischargeCubicMetersPerSecond,
      dischargeLitersPerSecond: total.dischargeLitersPerSecond + result.dischargeLitersPerSecond,
    }),
    { dischargeCubicMetersPerSecond: 0, dischargeLitersPerSecond: 0 },
  );
}
