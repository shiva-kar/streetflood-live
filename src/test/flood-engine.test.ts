import { describe, expect, it } from "vitest";
import {
  mapScoreToRisk,
  predictRisk,
  computeTiles,
  planRoute,
  predictiveAlerts,
  distanceKm,
  sheltersByDistance,
  tileBounds,
  tileAt,
} from "@/lib/flood/engine";
import { buildTiles, seedState, SHELTERS, EMERGENCY_CONTACTS, CHECKLISTS } from "@/lib/flood/data";
import type { AppState } from "@/lib/flood/types";

describe("Rule-based Flood Severity Engine", () => {
  it("correctly maps numerical scores to discrete risk levels", () => {
    expect(mapScoreToRisk(0)).toBe("Low");
    expect(mapScoreToRisk(19)).toBe("Low");
    expect(mapScoreToRisk(20)).toBe("Moderate");
    expect(mapScoreToRisk(39)).toBe("Moderate");
    expect(mapScoreToRisk(40)).toBe("High");
    expect(mapScoreToRisk(69)).toBe("High");
    expect(mapScoreToRisk(70)).toBe("Critical");
    expect(mapScoreToRisk(100)).toBe("Critical");
  });

  it("calculates tile severity with reports, closures, and sensor depth", () => {
    const now = Date.now();
    const state: AppState = seedState(now);
    const tiles = computeTiles(state, now);

    expect(tiles.length).toBe(24 * 24);

    // Tile t_20_16 has verified waist-deep reports and a road closure
    const tKurlaSubway = tiles.find((t) => t.id === "t_20_16")!;
    expect(tKurlaSubway).toBeDefined();
    expect(tKurlaSubway.closure).toBe("ClosedAllTraffic");
    expect(tKurlaSubway.currentRiskLevel).toBe("Critical");
    expect(tKurlaSubway.currentSeverityScore).toBeGreaterThanOrEqual(70);
    expect(tKurlaSubway.severityBreakdown.length).toBeGreaterThan(0);
  });

  it("increases severity score when an unverified report is verified", () => {
    const now = Date.now();
    const state: AppState = seedState(now);
    const initialTiles = computeTiles(state, now);
    const initialTile = initialTiles.find((t) => t.id === "t_3_5")!;

    // Verify report r3 on t_3_5
    const updatedState: AppState = {
      ...state,
      reports: state.reports.map((r) =>
        r.id === "r3" ? { ...r, status: "Verified", reviewedAt: new Date(now).toISOString() } : r,
      ),
    };
    const updatedTiles = computeTiles(updatedState, now);
    const updatedTile = updatedTiles.find((t) => t.id === "t_3_5")!;

    // Verified weight (20) > Unverified weight (10)
    expect(updatedTile.currentSeverityScore).toBeGreaterThan(initialTile.currentSeverityScore);
    expect(updatedTile.verifiedReports).toBeGreaterThan(initialTile.verifiedReports);
  });

  it("reduces severity score when a report is dismissed", () => {
    const now = Date.now();
    const state: AppState = seedState(now);
    const initialTiles = computeTiles(state, now);
    const initialTile = initialTiles.find((t) => t.id === "t_3_5")!;

    // Dismiss report r3
    const updatedState: AppState = {
      ...state,
      reports: state.reports.map((r) => (r.id === "r3" ? { ...r, status: "Dismissed" } : r)),
    };
    const updatedTiles = computeTiles(updatedState, now);
    const updatedTile = updatedTiles.find((t) => t.id === "t_3_5")!;

    expect(updatedTile.currentSeverityScore).toBeLessThan(initialTile.currentSeverityScore);
  });
});

describe("Rule-based 3-Hour Predictive Early Warning System", () => {
  it("predicts Moderate risk when rainfall and hotspot factors exceed threshold", () => {
    const res = predictRisk({
      recentRain: 25,
      forecastRain: 35,
      isHotspot: true,
      drainageScore: 20,
    });

    expect(res.level).toBe("Moderate");
    expect(res.pressure).toBeGreaterThanOrEqual(2);
    expect(res.reasons.length).toBeGreaterThan(0);
    expect(res.reasons.some((r) => r.includes("High recent rainfall"))).toBe(true);
    expect(res.reasons.some((r) => r.includes("Heavy forecast"))).toBe(true);
    expect(res.reasons.some((r) => r.includes("hotspot"))).toBe(true);
    expect(res.reasons.some((r) => r.includes("Poor drainage"))).toBe(true);
  });

  it("predicts Low risk during mild conditions", () => {
    const res = predictRisk({
      recentRain: 5,
      forecastRain: 10,
      isHotspot: false,
      drainageScore: 80,
    });

    expect(res.level).toBe("Low");
    expect(res.pressure).toBeLessThan(2);
  });

  it("generates automated advance warnings for zones with moderate predicted risk", () => {
    const now = Date.now();
    const state: AppState = seedState(now);
    const tiles = computeTiles(state, now);
    const alerts = predictiveAlerts(tiles, state, now);

    expect(alerts.length).toBeGreaterThan(0);
    const firstAlert = alerts[0];
    expect(firstAlert.type).toBe("PredictiveSimulated");
    expect(firstAlert.title).toContain("Advance warning");
    expect(firstAlert.tileIds.length).toBeGreaterThan(0);
  });
});

describe("A* Safe Route Navigation", () => {
  it("calculates a safe route on the tile grid that avoids closed roads", () => {
    const now = Date.now();
    const state: AppState = seedState(now);
    const tiles = computeTiles(state, now);

    // Route from Sion (t_2_4) to Chunabhatti (t_6_17)
    const result = planRoute(tiles, "t_2_4", "t_6_17");

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.path.length).toBeGreaterThan(1);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.minutes).toBeGreaterThan(0);
    expect(
      result.counts.Low + result.counts.Moderate + result.counts.High + result.counts.Critical,
    ).toBe(result.path.length);

    // Verify start and destination are respected
    expect(result.path[0].id).toBe("t_2_4");
    expect(result.path[result.path.length - 1].id).toBe("t_6_17");

    // The route must not include roads closed to all traffic
    const closedTiles = result.path.filter((t) => t.closure === "ClosedAllTraffic");
    expect(closedTiles.length).toBe(0);
  });
});

describe("Emergency Shelters & Preparedness Data", () => {
  it("correctly sorts shelters by distance from a given coordinate", () => {
    const sorted = sheltersByDistance(19.045, 72.865);
    expect(sorted.length).toBe(SHELTERS.length);

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].distanceKm).toBeGreaterThanOrEqual(sorted[i - 1].distanceKm);
    }
  });

  it("contains Indian emergency helplines and standard checklists", () => {
    expect(EMERGENCY_CONTACTS.some((c) => c.number === "112")).toBe(true);
    expect(EMERGENCY_CONTACTS.some((c) => c.number === "100")).toBe(true);
    expect(EMERGENCY_CONTACTS.some((c) => c.number === "108")).toBe(true);
    expect(EMERGENCY_CONTACTS.some((c) => c.number === "1916")).toBe(true);

    expect(CHECKLISTS.some((c) => c.key === "household")).toBe(true);
    expect(CHECKLISTS.some((c) => c.key === "vehicles")).toBe(true);
    expect(CHECKLISTS.some((c) => c.key === "vulnerable")).toBe(true);
  });
});
