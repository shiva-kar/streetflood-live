import { describe, expect, it } from "vitest";
import {
  analyzeElevationGrid,
  createElevationGrid,
  detectDepressions,
  flowDirectionAt,
  parseAsciiGrid,
} from "@/lib/hydrology/elevationEngine";
import { calculateRunoff, runoffCoefficient } from "@/lib/hydrology/runoffModel";
import { predictHarmonicTide, sampleTideSeries } from "@/lib/hydrology/tideHarmonics";
import { calculateDrainageStep, manningDischarge } from "@/lib/hydrology/drainageNetwork";

describe("hydrological core", () => {
  it("parses an elevation grid and derives D8 flow and depressions", () => {
    const grid = createElevationGrid(3, 3, [
      10, 9, 8,
      11, 4, 7,
      12, 6, 5,
    ], { cellSizeMeters: 30, west: 72.86, south: 19.04 });
    expect(flowDirectionAt(grid, 0, 0)).toBe("SE");
    expect(analyzeElevationGrid(grid)).toHaveLength(9);
    expect(detectDepressions(grid).some((cell) => cell.row === 1 && cell.col === 1)).toBe(true);
  });

  it("parses ESRI ASCII grid headers", () => {
    const grid = parseAsciiGrid(`ncols 2
nrows 2
xllcorner 72.8
yllcorner 19.0
cellsize 30
NODATA_value -9999
4 3
2 1`);
    expect(grid.rows).toBe(2);
    expect(grid.cols).toBe(2);
    expect(grid.values[3]).toBe(1);
  });

  it("uses the rational runoff equation with imperviousness and permeability", () => {
    const coefficient = runoffCoefficient(0.9, 0.1);
    const runoff = calculateRunoff({
      rainfallMmPerHour: 30,
      areaSquareMeters: 100,
      imperviousFraction: 0.9,
      soilPermeability: 0.1,
    });
    expect(coefficient).toBeGreaterThan(0.7);
    expect(runoff.dischargeLitersPerSecond).toBeGreaterThan(0);
    expect(runoff.dischargeCubicMetersPerSecond * 1000).toBeCloseTo(runoff.dischargeLitersPerSecond);
  });

  it("produces tide predictions and backflow risk", () => {
    const result = predictHarmonicTide(new Date("2026-07-20T12:00:00Z"), { rainRateMmPerHour: 25 });
    expect(result.heightMeters).toBeGreaterThan(0);
    expect(["Normal", "Elevated", "High"]).toContain(result.backflowRisk);
    expect(sampleTideSeries(new Date("2026-07-20T00:00:00Z"), 1, 30)).toHaveLength(3);
  });

  it("models drainage storage, gate backflow, and Manning capacity", () => {
    expect(manningDischarge(0.5, 1.5, 0.01, 0.03)).toBeGreaterThan(0);
    const nodes = [
      { id: "gate", lat: 19, lng: 72, elevationMeters: 1, storageCubicMeters: 100, maxDischargeCubicMetersPerSecond: 0.1, isGate: true },
    ];
    const states = calculateDrainageStep(nodes, [], {
      gate: { runoffCoefficient: 0.8, dischargeCubicMetersPerSecond: 0.05, dischargeLitersPerSecond: 50, rainfallIntensityMmPerHour: 20, infiltrationMmPerHour: 1 },
    }, {}, { seconds: 60, tideMeters: 4.5 });
    expect(states[0]?.backflowCubicMetersPerSecond).toBeGreaterThan(0);
    expect(states[0]?.surcharge).toBe(false);
  });
});
