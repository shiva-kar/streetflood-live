import { describe, it, expect } from "vitest";
import {
  getImpactMetrics,
  recordImpactEvent,
  computeLiveImpactStats,
  getDemonstrationScenario,
} from "@/lib/flood/impactTracker";
import type { FloodReport, RoadIncident, Shelter } from "@/lib/flood/types";

describe("Measurable Civic Impact Engine", () => {
  it("tracks real application events and computes latency", () => {
    const initial = getImpactMetrics();
    recordImpactEvent("report_submitted");
    recordImpactEvent("report_reviewed", 120);
    recordImpactEvent("route_calculated");

    const updated = getImpactMetrics();
    expect(updated.reportsSubmittedCount).toBeGreaterThanOrEqual(initial.reportsSubmittedCount + 1);
    expect(updated.reportsReviewedCount).toBeGreaterThanOrEqual(initial.reportsReviewedCount + 1);
    expect(updated.routesCalculatedCount).toBeGreaterThanOrEqual(initial.routesCalculatedCount + 1);
  });

  it("computes live impact statistics derived from active state", () => {
    const mockReports: FloodReport[] = [
      {
        id: "rep1",
        tileId: "t1",
        lat: 12.9265,
        lng: 77.6835,
        waterDepth: "WaistPlus",
        severityUser: "WaistPlus",
        description: "EcoSpace flooded",
        createdAt: new Date().toISOString(),
        status: "Verified",
      },
      {
        id: "rep2",
        tileId: "t2",
        lat: 12.9172,
        lng: 77.6228,
        waterDepth: "Knees",
        severityUser: "Knees",
        description: "Silk Board underpass waterlogged",
        createdAt: new Date().toISOString(),
        status: "Unverified",
      },
    ];

    const mockIncidents: RoadIncident[] = [
      {
        id: "inc1",
        tileId: "t1",
        status: "ClosedAllTraffic",
        description: "EcoSpace Closed",
        lat: 12.9265,
        lng: 77.6835,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "Authority",
      },
    ];

    const mockShelters: Shelter[] = [
      {
        id: "sh1",
        name: "Bellandur Refuge",
        address: "ORR Bellandur",
        lat: 12.9275,
        lng: 77.684,
        kind: "Community Hall",
        capacityStatus: "Space available",
        provenance: "Official Verified",
      },
    ];

    const stats = computeLiveImpactStats(mockReports, mockIncidents, mockShelters);

    expect(stats.totalReports).toBeGreaterThanOrEqual(2);
    expect(stats.reviewedReports).toBeGreaterThanOrEqual(1);
    expect(stats.reviewPct).toBeGreaterThan(0);
    expect(stats.accessibleSheltersCount).toBeGreaterThanOrEqual(1);
    expect(parseFloat(stats.avgReviewLatencyMin)).toBeGreaterThan(0);
  });

  it("validates calibrated corridor response scenario", () => {
    const scenario = getDemonstrationScenario();

    expect(scenario.corridor).toContain("Outer Ring Road");
    expect(scenario.commuteTimeSavedMinutes).toBeGreaterThan(60);
    expect(scenario.riskReductionPct).toBeGreaterThanOrEqual(90);
    expect(scenario.streetFloodAiResponse.engineHydroLockRiskPct).toBeLessThan(5);
    expect(scenario.uncoordinatedCommute.engineHydroLockRiskPct).toBeGreaterThan(50);
  });
});
