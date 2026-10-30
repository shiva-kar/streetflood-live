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
import { getEnrichedBreakdown } from "@/components/flood/breakdownHelper";
import type { AppState, FloodReport } from "@/lib/flood/types";

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

describe("Score Calculation Breakdown Display (TileDetailsSheet)", () => {
  it("displays WaistPlus unverified and verified reports with x2.0 multiplier and accurate contributions", () => {
    const now = Date.now();
    const state = seedState(now);
    const tiles = computeTiles(state, now);
    const tKurla = tiles.find((t) => t.id === "t_20_16")!;

    const breakdown = getEnrichedBreakdown(tKurla, state.reports, now);

    const unverifiedItem = breakdown.find((b) => b.label.includes("unverified"));
    expect(unverifiedItem).toBeDefined();
    expect(unverifiedItem!.label).toBe("1 unverified report (Waist-deep ×2.0)");
    expect(unverifiedItem!.points).toBe("+20");

    const verifiedItem = breakdown.find(
      (b) => b.label.includes("verified") && !b.label.includes("unverified"),
    );
    expect(verifiedItem).toBeDefined();
    expect(verifiedItem!.label).toBe("1 verified report (Waist-deep ×2.0)");
    expect(verifiedItem!.points).toBe("+40");
  });

  it("displays other water-depth levels with their correct multipliers", () => {
    const now = Date.now();
    const testTileId = "t_10_10";

    const customReports: FloodReport[] = [
      {
        id: "cr1",
        tileId: testTileId,
        lat: 19.04,
        lng: 72.87,
        description: "Footpath test",
        severityUser: "Footpath",
        createdAt: new Date(now - 10000).toISOString(),
        status: "Unverified",
      },
      {
        id: "cr2",
        tileId: testTileId,
        lat: 19.04,
        lng: 72.87,
        description: "Ankles test",
        severityUser: "Ankles",
        createdAt: new Date(now - 10000).toISOString(),
        status: "Verified",
      },
      {
        id: "cr3",
        tileId: testTileId,
        lat: 19.04,
        lng: 72.87,
        description: "Knees test",
        severityUser: "Knees",
        createdAt: new Date(now - 10000).toISOString(),
        status: "Unverified",
      },
    ];

    const state: AppState = {
      ...seedState(now),
      reports: customReports,
      incidents: [],
    };

    const tiles = computeTiles(state, now);
    const tile = tiles.find((t) => t.id === testTileId)!;
    const breakdown = getEnrichedBreakdown(tile, customReports, now);

    // Footpath unverified: 10 * 0.5 = 5
    const footpathItem = breakdown.find((b) => b.label.includes("Footpath"));
    expect(footpathItem).toBeDefined();
    expect(footpathItem!.label).toBe("1 unverified report (Footpath ×0.5)");
    expect(footpathItem!.points).toBe("+5");

    // Ankles verified: 20 * 1.0 = 20
    const anklesItem = breakdown.find((b) => b.label.includes("Ankle-deep"));
    expect(anklesItem).toBeDefined();
    expect(anklesItem!.label).toBe("1 verified report (Ankle-deep ×1.0)");
    expect(anklesItem!.points).toBe("+20");

    // Knees unverified: 10 * 1.5 = 15
    const kneesItem = breakdown.find((b) => b.label.includes("Knee-deep"));
    expect(kneesItem).toBeDefined();
    expect(kneesItem!.label).toBe("1 unverified report (Knee-deep ×1.5)");
    expect(kneesItem!.points).toBe("+15");
  });

  it("accurately represents multiple reports with different depth levels without collapsing to one multiplier", () => {
    const now = Date.now();
    const testTileId = "t_10_10";

    const customReports: FloodReport[] = [
      {
        id: "m1",
        tileId: testTileId,
        lat: 19.04,
        lng: 72.87,
        description: "Waist report",
        severityUser: "WaistPlus",
        createdAt: new Date(now - 10000).toISOString(),
        status: "Unverified",
      },
      {
        id: "m2",
        tileId: testTileId,
        lat: 19.04,
        lng: 72.87,
        description: "Knee report",
        severityUser: "Knees",
        createdAt: new Date(now - 10000).toISOString(),
        status: "Unverified",
      },
    ];

    const state: AppState = {
      ...seedState(now),
      reports: customReports,
      incidents: [],
    };

    const tiles = computeTiles(state, now);
    const tile = tiles.find((t) => t.id === testTileId)!;
    const breakdown = getEnrichedBreakdown(tile, customReports, now);

    const waistItem = breakdown.find((b) => b.label.includes("Waist-deep"));
    const kneeItem = breakdown.find((b) => b.label.includes("Knee-deep"));

    expect(waistItem).toBeDefined();
    expect(kneeItem).toBeDefined();
    expect(waistItem!.label).toBe("1 unverified report (Waist-deep ×2.0)");
    expect(waistItem!.points).toBe("+20");
    expect(kneeItem!.label).toBe("1 unverified report (Knee-deep ×1.5)");
    expect(kneeItem!.points).toBe("+15");

    // Sum of points should match 20 + 15 = 35 from reports
    const reportTotal =
      parseInt(waistItem!.points.replace("+", ""), 10) +
      parseInt(kneeItem!.points.replace("+", ""), 10);
    expect(reportTotal).toBe(35);
  });
});
