import { describe, expect, it } from "vitest";
import { advanceIncident, INCIDENT_LIFECYCLE, rankDispatchResources } from "@/lib/ics/dispatchEngine";
import { generateCapXml } from "@/lib/ics/capGenerator";
import { chooseSafestRoute } from "@/lib/routing/multiModalRouter";
import { routeToGpx, routeToKml } from "@/lib/routing/gpxExporter";
import { allocateShelterBeds, shelterCanAccept } from "@/lib/shelters/occupancyManager";
import { ingestTelemetryPacket } from "@/lib/telemetry/iotIngestion";
import { calculateTrustScore, clusterReports } from "@/lib/reporting/antiFraudEngine";
import type { RoadRouteResult } from "@/lib/flood/types";

const route = (safetyStatus: RoadRouteResult["safetyStatus"], safetyScore: number): RoadRouteResult => ({
  coordinates: [[19.04, 72.86], [19.05, 72.87]],
  distanceKm: 1,
  durationMinutes: 10,
  steps: [],
  safetyScore,
  safetyStatus,
  safetyMessage: "Route evaluated",
  counts: { Low: 1, Moderate: 0, High: 0, Critical: 0 },
  dangerWarnings: [],
  provider: "CorridorFallback",
});

describe("enterprise operational modules", () => {
  it("enforces incident lifecycle progression and audit history", () => {
    const incident = { id: "i1", wardCode: "L", lat: 19, lng: 72, status: INCIDENT_LIFECYCLE[0], auditTrail: [] };
    const next = advanceIncident(incident, "Triage / Verified", "officer-1");
    expect(next.auditTrail).toHaveLength(1);
    expect(() => advanceIncident(next, "Closed", "officer-1")).toThrow();
  });

  it("ranks resources and emits CAP polygon XML", () => {
    const ranked = rankDispatchResources([
      { id: "p1", type: "pump", lat: 19, lng: 72, available: true },
      { id: "p2", type: "pump", lat: 20, lng: 73, available: true },
    ], { id: "i", wardCode: "L", lat: 19.01, lng: 72.01, status: "Received", auditTrail: [] });
    expect(ranked[0]?.resource.id).toBe("p1");
    expect(generateCapXml({
      identifier: "cap-1", sender: "streetflood.live", headline: "Flood warning", description: "Waterlogging",
      instruction: "Avoid low-lying roads", urgency: "Immediate", severity: "Severe", certainty: "Observed",
      polygon: [[19, 72], [19, 73], [20, 73]],
    })).toContain("<polygon>19.000000,72.000000");
  });

  it("selects safe routes and exports GPX/KML", () => {
    expect(chooseSafestRoute([route("Impassable", 0), route("Safe", 90)], "car")?.safetyScore).toBe(90);
    expect(routeToGpx(route("Safe", 90))).toContain("<gpx");
    expect(routeToKml(route("Safe", 90))).toContain("<kml");
  });

  it("checks shelter capacity and accessibility requirements", () => {
    const shelter = { id: "s", totalCapacity: 10, currentHeadcount: 4, drinkingWaterLiters: 100, mealPackets: 10, generatorHours: 4, pediatricFormulaUnits: 2, physicianOnSite: true, wheelchairAccessible: true, petFriendly: false };
    expect(shelterCanAccept(shelter, { people: 3, wheelchair: true, medical: true })).toBe(true);
    expect(allocateShelterBeds(shelter, 3).currentHeadcount).toBe(7);
  });

  it("validates telemetry, detects alarms, and computes anti-fraud trust", () => {
    const telemetry = ingestTelemetryPacket({ sensorId: "s1", hardwareModel: "VALKYRIE-RADAR-V2", lat: 19, lng: 72, installationType: "curb_depth", waterDepthCm: 20, rateOfRiseMmMin: 25, batteryMilliVolts: 12000, signalRssi: -60, timestamp: "2026-11-01T00:00:00Z", tamperAlert: false });
    expect(telemetry.alarms[0]?.severity).toBe("Critical");
    expect(calculateTrustScore({ deviceTenureDays: 365, distanceFromGpsMeters: 20, confirmations: 2, roadClearVotes: 0 })).toBeGreaterThan(0.7);
    expect(clusterReports([{ lat: 19, lng: 72, createdAt: "2026-11-01T00:00:00Z" }, { lat: 19.0001, lng: 72.0001, createdAt: "2026-11-01T00:05:00Z" }])).toHaveLength(1);
  });
});
