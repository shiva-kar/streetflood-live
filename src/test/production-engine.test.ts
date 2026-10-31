import { describe, expect, it } from "vitest";
import {
  generateViewportTiles,
  getCivicSafetyStatus,
  snapCoordToGrid,
  tileIdFromLatLng,
} from "@/lib/flood/dynamicGrid";
import type { FloodReport, RoadIncident } from "@/lib/flood/types";

describe("Production Dynamic Scoring & Grid Engine", () => {
  it("snaps arbitrary worldwide coordinates to deterministic ~100m geocells", () => {
    // Mumbai coordinate
    const mumbai = snapCoordToGrid(19.048, 72.868);
    expect(mumbai.id).toBeDefined();
    expect(mumbai.id).toMatch(/^t_\d+_\d+$/);
    expect(mumbai.centerLat).toBeCloseTo(19.048, 2);
    expect(mumbai.centerLng).toBeCloseTo(72.868, 2);

    // Tokyo coordinate
    const tokyo = snapCoordToGrid(35.6762, 139.6503);
    expect(tokyo.id).toBeDefined();
    expect(tokyo.id).toMatch(/^t_\d+_\d+$/);

    // London coordinate
    const london = snapCoordToGrid(51.5074, -0.1278);
    expect(london.id).toBeDefined();

    // Idempotent snapping
    expect(tileIdFromLatLng(19.048, 72.868)).toBe(mumbai.id);
  });

  it("applies recency decay: fresh reports carry significantly more weight than aging reports", () => {
    const now = Date.now();
    const lat = 19.05;
    const lng = 72.87;
    const bbox = { south: 19.049, north: 19.051, west: 72.869, east: 72.871 };

    // Fresh report (5 minutes ago)
    const freshReport: FloodReport = {
      id: "fresh_1",
      tileId: tileIdFromLatLng(lat, lng),
      lat,
      lng,
      description: "Waterlogging at corner",
      severityUser: "Knees",
      createdAt: new Date(now - 5 * 60 * 1000).toISOString(),
      status: "Verified",
      confirmVotes: 2,
      clearedVotes: 0,
    };

    // Aging report (5.5 hours ago)
    const oldReport: FloodReport = {
      id: "old_1",
      tileId: tileIdFromLatLng(lat, lng),
      lat,
      lng,
      description: "Waterlogging earlier today",
      severityUser: "Knees",
      createdAt: new Date(now - 5.5 * 3600 * 1000).toISOString(),
      status: "Verified",
      confirmVotes: 2,
      clearedVotes: 0,
    };

    const tilesFresh = generateViewportTiles(bbox, [freshReport], [], 0, 0, now);
    const targetFresh = tilesFresh.find((t) => t.id === freshReport.tileId);

    const tilesOld = generateViewportTiles(bbox, [oldReport], [], 0, 0, now);
    const targetOld = tilesOld.find((t) => t.id === oldReport.tileId);

    expect(targetFresh).toBeDefined();
    expect(targetOld).toBeDefined();
    expect(targetFresh!.currentSeverityScore).toBeGreaterThan(targetOld!.currentSeverityScore);
  });

  it("weights community consensus: confirmations boost confidence, cleared votes reduce score", () => {
    const now = Date.now();
    const lat = 19.05;
    const lng = 72.87;
    const bbox = { south: 19.049, north: 19.051, west: 72.869, east: 72.871 };

    const confirmedReport: FloodReport = {
      id: "rep_c",
      tileId: tileIdFromLatLng(lat, lng),
      lat,
      lng,
      description: "Severe water",
      severityUser: "Knees",
      createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
      status: "Unverified",
      confirmVotes: 4,
      clearedVotes: 0,
    };

    const clearedReport: FloodReport = {
      id: "rep_d",
      tileId: tileIdFromLatLng(lat, lng),
      lat,
      lng,
      description: "Severe water",
      severityUser: "Knees",
      createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
      status: "Unverified",
      confirmVotes: 0,
      clearedVotes: 3,
    };

    const tilesConfirmed = generateViewportTiles(bbox, [confirmedReport], [], 0, 0, now);
    const tilesCleared = generateViewportTiles(bbox, [clearedReport], [], 0, 0, now);

    const scoreConfirmed = tilesConfirmed.find((t) => t.id === confirmedReport.tileId)!
      .currentSeverityScore;
    const scoreCleared = tilesCleared.find((t) => t.id === clearedReport.tileId)!
      .currentSeverityScore;

    expect(scoreConfirmed).toBeGreaterThan(scoreCleared);
  });

  it("prioritizes official authority road closures to Critical severity", () => {
    const now = Date.now();
    const lat = 19.05;
    const lng = 72.87;
    const bbox = { south: 19.049, north: 19.051, west: 72.869, east: 72.871 };

    const closureIncident: RoadIncident = {
      id: "inc_1",
      tileId: tileIdFromLatLng(lat, lng),
      status: "ClosedAllTraffic",
      description: "Underpass submerged",
      lat,
      lng,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      createdBy: "Authority",
    };

    const tiles = generateViewportTiles(bbox, [], [closureIncident], 0, 0, now);
    const closedTile = tiles.find((t) => t.id === closureIncident.tileId);

    expect(closedTile).toBeDefined();
    expect(closedTile!.currentSeverityScore).toBeGreaterThanOrEqual(70);
    expect(closedTile!.currentRiskLevel).toBe("Critical");
    expect(closedTile!.closure).toBe("ClosedAllTraffic");
  });

  it("maps numerical risk scores to plain-language civic labels", () => {
    const safe = getCivicSafetyStatus(10);
    expect(safe.headline).toContain("Safe");

    const caution = getCivicSafetyStatus(25);
    expect(caution.headline).toContain("Caution");

    const avoid = getCivicSafetyStatus(55);
    expect(avoid.headline).toContain("Avoid");

    const danger = getCivicSafetyStatus(85);
    expect(danger.headline).toContain("Danger");

    // Road closure forces Danger status regardless of raw score
    const closureDanger = getCivicSafetyStatus(0, "ClosedAllTraffic");
    expect(closureDanger.headline).toContain("Danger");
  });
});
