import { describe, expect, it } from "vitest";
import { SION_KURLA_OSM_ROADS, evaluateOsmRoadRisk } from "@/lib/flood/osmNetwork";
import { computeTiles } from "@/lib/flood/engine";
import { seedState } from "@/lib/flood/data";

describe("OpenStreetMap Real Road Network & Flood Evaluation", () => {
  it("loads authoritative OpenStreetMap road network with high geographic coverage", () => {
    expect(SION_KURLA_OSM_ROADS.length).toBeGreaterThan(500);

    const namedRoads = SION_KURLA_OSM_ROADS.filter((r) => r.name && r.name.length > 0);
    expect(namedRoads.length).toBeGreaterThan(100);

    const lbsMarg = SION_KURLA_OSM_ROADS.some((r) =>
      r.name.toLowerCase().includes("lal bahadur shastri") || r.name.toLowerCase().includes("lbs"),
    );
    expect(lbsMarg).toBe(true);

    const sionCircle = SION_KURLA_OSM_ROADS.some((r) =>
      r.name.toLowerCase().includes("sion circle") || r.name.toLowerCase().includes("sion"),
    );
    expect(sionCircle).toBe(true);
  });

  it("coordinates follow valid Mumbai geographic bounds (WGS84 [lat, lng])", () => {
    for (const road of SION_KURLA_OSM_ROADS.slice(0, 50)) {
      expect(road.coordinates.length).toBeGreaterThanOrEqual(2);
      for (const [lat, lng] of road.coordinates) {
        expect(lat).toBeGreaterThan(19.03);
        expect(lat).toBeLessThan(19.08);
        expect(lng).toBeGreaterThan(72.84);
        expect(lng).toBeLessThan(72.9);
      }
    }
  });

  it("accurately detects Closed status on road segments affected by official municipal roadblocks", () => {
    const now = Date.now();
    const state = seedState(now);
    const tiles = computeTiles(state, now);
    const tileMap = new Map(tiles.map((t) => [t.id, t]));

    // Find road segment affected by the Kurla Subway incident (ClosedAllTraffic)
    const closedRoads = SION_KURLA_OSM_ROADS.filter((r) => {
      const res = evaluateOsmRoadRisk(r, tileMap, state.incidents, state.reports);
      return res.riskLevel === "Closed";
    });

    expect(closedRoads.length).toBeGreaterThan(0);
    const primaryClosedRoad = closedRoads[0];
    const result = evaluateOsmRoadRisk(primaryClosedRoad, tileMap, state.incidents, state.reports);
    expect(result.riskLevel).toBe("Closed");
    expect(result.severityScore).toBe(100);
    expect(result.reason.toLowerCase()).toContain("closed");

    // Also verify incident i2 in direct tile t_2_4 triggers restriction
    const tileWithIncident = state.incidents[1].tileId; // t_2_4
    const roadInTile = SION_KURLA_OSM_ROADS.find((r) => r.tileIds.includes(tileWithIncident));
    expect(roadInTile).toBeDefined();
    if (roadInTile) {
      const res2 = evaluateOsmRoadRisk(roadInTile, tileMap, state.incidents, state.reports);
      expect(["Closed", "Critical"]).toContain(res2.riskLevel);
    }
  });

  it("evaluates Low risk for roads in unflooded surveyed blocks", () => {
    const now = Date.now();
    const state = seedState(now);
    const tiles = computeTiles(state, now);
    const tileMap = new Map(tiles.map((t) => [t.id, t]));

    const lowRiskRoad = SION_KURLA_OSM_ROADS.find((r) => {
      if (r.tileIds.length === 0) return false;
      const res = evaluateOsmRoadRisk(r, tileMap, state.incidents, state.reports);
      return res.riskLevel === "Low";
    });

    expect(lowRiskRoad).toBeDefined();
    if (lowRiskRoad) {
      const result = evaluateOsmRoadRisk(lowRiskRoad, tileMap, state.incidents, state.reports);
      expect(result.riskLevel).toBe("Low");
      expect(result.severityScore).toBeLessThan(20);
    }
  });
});
