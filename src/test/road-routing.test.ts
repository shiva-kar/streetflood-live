import { describe, expect, it } from "vitest";
import {
  calculateRoadRoute,
  evaluateRouteRisk,
  findBestShelterEvacuation,
  getCorridorFallbackRoute,
  SION_KURLA_ROAD_NETWORK,
} from "@/lib/flood/roadRouting";
import { computeTiles } from "@/lib/flood/engine";
import { buildTiles, seedState, SHELTERS, AFFECTED_ROAD_CORRIDORS } from "@/lib/flood/data";
import type { AppState, FloodReport, RoadIncident } from "@/lib/flood/types";

describe("Road-Based Evacuation Routing Engine", () => {
  it("generates road-following geometry with turn-by-turn steps, distance, and duration", async () => {
    const now = Date.now();
    const state = seedState(now);
    const tiles = computeTiles(state, now);

    const fromCoord = { lat: 19.0455, lng: 72.8655 }; // Sion Hospital
    const toCoord = { lat: 19.0515, lng: 72.8712 }; // Shelter E (Sion-Kurla link road)

    const route = await calculateRoadRoute(
      fromCoord,
      toCoord,
      tiles,
      state.reports,
      state.incidents,
    );

    expect(route).toBeDefined();
    expect(route.coordinates.length).toBeGreaterThan(2);
    expect(route.distanceKm).toBeGreaterThan(0.5);
    expect(route.durationMinutes).toBeGreaterThanOrEqual(1);
    expect(route.steps.length).toBeGreaterThan(0);

    // Verify first and last points are within reasonable proximity to endpoints
    const firstPt = route.coordinates[0];
    const lastPt = route.coordinates[route.coordinates.length - 1];
    expect(Math.abs(firstPt[0] - fromCoord.lat)).toBeLessThan(0.01);
    expect(Math.abs(lastPt[0] - toCoord.lat)).toBeLessThan(0.01);
  });

  it("detects road closures on route and marks route as Impassable with NO SUFFICIENTLY SAFE ROUTE FOUND", () => {
    const now = Date.now();
    const state = seedState(now);
    const tiles = computeTiles(state, now);

    // Create a route that passes directly through the closed Kurla subway [19.0588, 72.8765]
    const closedCoords: [number, number][] = [
      [19.057, 72.8745],
      [19.058, 72.8755],
      [19.0588, 72.8765], // Kurla Subway (ClosedAllTraffic)
      [19.06, 72.8775],
    ];

    const risk = evaluateRouteRisk(closedCoords, tiles, state.reports, state.incidents);

    expect(risk.safetyStatus).toBe("Impassable");
    expect(risk.safetyScore).toBe(0);
    expect(risk.blockedByClosure).toBeDefined();
    expect(risk.safetyMessage).toContain("NO SUFFICIENTLY SAFE ROUTE FOUND");
    expect(risk.safetyMessage).toContain("closed to all traffic");
  });

  it("detects critical flood inundation and flags impassable hazard", () => {
    const now = Date.now();
    const state = seedState(now);
    const tiles = computeTiles(state, now);

    const criticalCoords: [number, number][] = [
      [19.0584, 72.8756], // Report r4 has WaistPlus verified
      [19.0585, 72.8757], // Report r5 has WaistPlus unverified
    ];

    const incidentsWithoutClosure: RoadIncident[] = []; // No closures, test water depth only

    const risk = evaluateRouteRisk(criticalCoords, tiles, state.reports, incidentsWithoutClosure);

    expect(risk.safetyStatus).toBe("Impassable");
    expect(risk.safetyScore).toBeLessThanOrEqual(20);
    expect(risk.safetyMessage).toContain("NO SUFFICIENTLY SAFE ROUTE FOUND");
    expect(risk.dangerWarnings.some((w) => w.includes("Waist-deep"))).toBe(true);
  });

  it("selects safest reachable shelter rather than blindly choosing geographically closest shelter", async () => {
    const now = Date.now();
    const state = seedState(now);
    const tiles = computeTiles(state, now);

    const origin = { lat: 19.0455, lng: 72.8655 }; // Sion Hospital

    const { recommended, candidates } = await findBestShelterEvacuation(
      origin,
      SHELTERS,
      tiles,
      state.reports,
      state.incidents,
    );

    expect(candidates.length).toBe(SHELTERS.length);
    expect(recommended).toBeDefined();

    // Recommended shelter must have an acceptable safe or caution route, NOT impassable
    expect(recommended!.route).toBeDefined();
    expect(recommended!.route!.safetyStatus).not.toBe("Impassable");
    expect(recommended!.isRecommended).toBe(true);

    // Verify candidate to Kurla West (Shelter C) detects proximity to Kurla subway closure
    const shelterC = candidates.find((c) => c.shelter.id === "sh3");
    expect(shelterC).toBeDefined();
  });

  it("provides real mapped road corridor coordinates for flood-affected streets", () => {
    expect(AFFECTED_ROAD_CORRIDORS.length).toBeGreaterThanOrEqual(4);

    for (const corr of AFFECTED_ROAD_CORRIDORS) {
      expect(corr.name).toBeDefined();
      expect(corr.roadName).toBeDefined();
      expect(corr.coordinates.length).toBeGreaterThanOrEqual(4);

      // Verify each coordinate lies within the greater Sion-Kurla bounding area
      for (const [lat, lng] of corr.coordinates) {
        expect(lat).toBeGreaterThanOrEqual(19.03);
        expect(lat).toBeLessThanOrEqual(19.08);
        expect(lng).toBeGreaterThanOrEqual(72.85);
        expect(lng).toBeLessThanOrEqual(72.9);
      }
    }
  });

  it("provides high-fidelity mapped corridor fallback when OSRM is offline", () => {
    const now = Date.now();
    const state = seedState(now);
    const tiles = computeTiles(state, now);

    const fromCoord = { lat: 19.0435, lng: 72.8625 }; // Sion Circle
    const toCoord = { lat: 19.0515, lng: 72.8712 }; // Shelter E

    const fallback = getCorridorFallbackRoute(
      fromCoord,
      toCoord,
      tiles,
      state.reports,
      state.incidents,
    );

    expect(fallback.provider).toBe("CorridorFallback");
    expect(fallback.coordinates.length).toBeGreaterThan(2);
    expect(fallback.distanceKm).toBeGreaterThan(0.5);
    expect(fallback.durationMinutes).toBeGreaterThan(0);
    expect(fallback.steps.length).toBeGreaterThan(0);
  });
});
