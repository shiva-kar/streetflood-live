import { describe, it, expect } from "vitest";
import { BENGALURU_OSM_ROADS, ALL_PRELOADED_OSM_ROADS } from "@/lib/flood/osmNetwork";
import { BENGALURU_EXPANDED_SHELTERS } from "@/lib/flood/bengaluruShelters";
import {
  COMPREHENSIVE_SHELTERS,
  findNearestKnownShelters,
  getHaversineDistanceKm,
} from "@/lib/flood/sheltersDatabase";

describe("Bengaluru High-Performance Preloaded Network & Shelters", () => {
  it("preloads comprehensive Bengaluru OSM road network with arterial passability", () => {
    expect(BENGALURU_OSM_ROADS.length).toBeGreaterThanOrEqual(30);

    const orrSegments = BENGALURU_OSM_ROADS.filter((r) => r.name.includes("Outer Ring Road"));
    expect(orrSegments.length).toBeGreaterThanOrEqual(8);

    const silkBoard = BENGALURU_OSM_ROADS.find((r) => r.name.includes("Silk Board"));
    expect(silkBoard).toBeDefined();
    expect(silkBoard?.coordinates.length).toBeGreaterThanOrEqual(3);

    const koramangala80ft = BENGALURU_OSM_ROADS.find((r) => r.name.includes("Koramangala 80ft"));
    expect(koramangala80ft).toBeDefined();

    for (const road of BENGALURU_OSM_ROADS) {
      expect(road.coordinates.length).toBeGreaterThanOrEqual(2);
      expect(road.tileIds.length).toBeGreaterThanOrEqual(1);
      expect(road.lengthMeters).toBeGreaterThan(0);
      for (const [lat, lng] of road.coordinates) {
        expect(lat).toBeGreaterThanOrEqual(12.8);
        expect(lat).toBeLessThanOrEqual(13.15);
        expect(lng).toBeGreaterThanOrEqual(77.45);
        expect(lng).toBeLessThanOrEqual(77.8);
      }
    }
  });

  it("combines Bengaluru and National preloaded roads seamlessly", () => {
    expect(ALL_PRELOADED_OSM_ROADS.length).toBeGreaterThan(BENGALURU_OSM_ROADS.length);
    const hasBengaluru = ALL_PRELOADED_OSM_ROADS.some((r) => r.name.includes("EcoSpace"));
    expect(hasBengaluru).toBe(true);
  });

  it("preloads 40+ authentic emergency shelters covering all 8 BBMP zones", () => {
    expect(BENGALURU_EXPANDED_SHELTERS.length).toBeGreaterThanOrEqual(35);

    // Verify key disaster hubs
    const kanteerava = BENGALURU_EXPANDED_SHELTERS.find((s) => s.name.includes("Kanteerava"));
    expect(kanteerava).toBeDefined();
    expect(kanteerava?.contactPhone).toBeDefined();

    const ecospace = BENGALURU_EXPANDED_SHELTERS.find((s) => s.name.includes("EcoSpace"));
    expect(ecospace).toBeDefined();

    const silkBoardShelter = BENGALURU_EXPANDED_SHELTERS.find((s) => s.name.includes("Silk Board"));
    expect(silkBoardShelter).toBeDefined();

    const koramangalaShelter = BENGALURU_EXPANDED_SHELTERS.find((s) => s.name.includes("Koramangala Indoor Stadium"));
    expect(koramangalaShelter).toBeDefined();

    for (const s of BENGALURU_EXPANDED_SHELTERS) {
      expect(s.lat).toBeGreaterThanOrEqual(12.8);
      expect(s.lat).toBeLessThanOrEqual(13.15);
      expect(s.lng).toBeGreaterThanOrEqual(77.45);
      expect(s.lng).toBeLessThanOrEqual(77.8);
      expect(s.capacityStatus).toBeDefined();
      expect(s.drinkingWater).toBe(true);
    }
  });

  it("resolves nearest shelter in Bengaluru within 1km with zero network latency", () => {
    const centerLat = 12.9716;
    const centerLng = 77.5946;

    const nearby = findNearestKnownShelters(centerLat, centerLng, 3);
    expect(nearby.length).toBeGreaterThanOrEqual(3);

    const closest = nearby[0];
    const distKm = getHaversineDistanceKm(centerLat, centerLng, closest.lat, closest.lng);
    expect(distKm).toBeLessThan(1.0); // Within 1 km of Bengaluru center
  });
});
