import { describe, it, expect } from "vitest";
import {
  COMPREHENSIVE_SHELTERS,
  findNearestKnownShelters,
  getHaversineDistanceKm,
  formatDistanceString,
} from "@/lib/flood/sheltersDatabase";

describe("Comprehensive Shelters Database & Proximity Search", () => {
  it("contains rich official shelters across India (Assam, Odisha, Bihar, etc.) and worldwide", () => {
    expect(COMPREHENSIVE_SHELTERS.length).toBeGreaterThan(30);

    const assamShelters = COMPREHENSIVE_SHELTERS.filter((s) => s.id.startsWith("as_"));
    expect(assamShelters.length).toBeGreaterThanOrEqual(10);

    const odishaShelters = COMPREHENSIVE_SHELTERS.filter((s) => s.id.startsWith("od_"));
    expect(odishaShelters.length).toBeGreaterThanOrEqual(5);

    // Verify ZERO demo or simulated strings exist in names or addresses
    for (const s of COMPREHENSIVE_SHELTERS) {
      expect(s.name.toLowerCase()).not.toContain("demo");
      expect(s.address.toLowerCase()).not.toContain("simulated");
      expect(s.provenance).toBe("Official Verified");
    }
  });

  it("accurately returns Assam shelters when querying coordinates in Assam (e.g. Guwahati)", () => {
    // Guwahati coordinates: ~26.14, 91.77
    const nearest = findNearestKnownShelters(26.1433, 91.7898, 3);
    expect(nearest.length).toBe(3);

    // The closest shelter MUST be an Assam shelter, NOT a Mumbai shelter!
    expect(nearest[0].id).toContain("as_");
    expect(nearest[0].address).toContain("Assam");
    expect(nearest[0].distanceKm).toBeLessThan(5); // Within 5 km of Guwahati
  });

  it("accurately returns Silchar / Barak Valley shelters when querying Silchar coordinates", () => {
    // Silchar coordinates: ~24.83, 92.78
    const nearest = findNearestKnownShelters(24.8333, 92.7789, 2);
    expect(nearest[0].id).toBe("as_sil_01");
    expect(nearest[0].name).toContain("Cachar District Disaster Relief");
    expect(nearest[0].distanceKm).toBeLessThan(1);
  });

  it("accurately formats distance strings for meters and kilometers", () => {
    expect(formatDistanceString(0.35)).toBe("350 m away");
    expect(formatDistanceString(2.4)).toBe("2.4 km away");
    expect(formatDistanceString(15.8)).toBe("15.8 km away");
  });

  it("computes accurate Haversine distances between known global cities", () => {
    // Mumbai (18.94, 72.83) to Guwahati (26.14, 91.79) is approx 2050 km
    const dist = getHaversineDistanceKm(18.9402, 72.8355, 26.1433, 91.7898);
    expect(dist).toBeGreaterThan(2000);
    expect(dist).toBeLessThan(2150);
  });
});
