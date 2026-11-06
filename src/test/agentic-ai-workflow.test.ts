import { describe, it, expect } from "vitest";
import {
  analyzeCitizenReport,
  generateMunicipalTriageSummary,
  recordWorkflowStep,
  getWorkflowAuditLogs,
} from "@/lib/ai/agenticWorkflow";
import type { FloodReport, RoadIncident, Shelter } from "@/lib/flood/types";
import type { RealWeatherResult } from "@/lib/flood/openData";

describe("Agentic AI Civic Workflow & Analysis Engine", () => {
  const mockWeather: RealWeatherResult = {
    recentRainMm: 28,
    rainRateMmPerHour: 22,
    forecastRain3hMm: 60,
    hourlyTimes: ["14:00", "15:00", "16:00"],
    hourlyRainMm: [10, 22, 28],
    temperatureC: 24,
    weatherCode: 65,
  };

  const existingReports: FloodReport[] = [
    {
      id: "blr_rep_1",
      tileId: "t_14352_86315",
      lat: 12.9265,
      lng: 77.6835,
      waterDepth: "Knees",
      severityUser: "Knees",
      description: "Outer Ring Road EcoSpace service road has 1.5ft water pooling.",
      createdAt: new Date().toISOString(),
      status: "Unverified",
    },
  ];

  it("extracts affected Bengaluru corridor and classifies incident category", () => {
    const analysis = analyzeCitizenReport(
      {
        id: "rep_test_1",
        lat: 12.927,
        lng: 77.684,
        waterDepth: "WaistPlus",
        description: "Water rushing into the EcoSpace underpass from the nearby canal.",
      },
      [],
      mockWeather
    );

    expect(analysis.identifiedRoadOrLandmark).toContain("EcoSpace");
    expect(analysis.incidentCategory).toBe("Underpass Inundation");
    expect(analysis.recommendedPriority).toBe("Critical");
    expect(analysis.recommendedAction).toBe("Immediate Municipal Verification");
  });

  it("detects nearby duplicate submissions within 150m window", () => {
    const analysis = analyzeCitizenReport(
      {
        id: "rep_test_duplicate",
        lat: 12.9266, // ~15m away from existingReports[0]
        lng: 77.6836,
        waterDepth: "Knees",
        description: "EcoSpace service road waterlogging",
      },
      existingReports,
      mockWeather
    );

    expect(analysis.duplicateRisk.isPotentialDuplicate).toBe(true);
    expect(analysis.duplicateRisk.duplicateOfReportId).toBe("blr_rep_1");
    expect(analysis.duplicateRisk.similarityScore).toBeGreaterThanOrEqual(70);
  });

  it("flags anomalies when extreme water depth is claimed with zero rain", () => {
    const dryWeather: RealWeatherResult = {
      recentRainMm: 0,
      rainRateMmPerHour: 0,
      forecastRain3hMm: 0,
      hourlyTimes: ["14:00"],
      hourlyRainMm: [0],
      temperatureC: 30,
      weatherCode: 0,
    };

    const analysis = analyzeCitizenReport(
      {
        id: "rep_test_anomaly",
        lat: 12.9716,
        lng: 77.5946,
        waterDepth: "WaistPlus",
        description: "Huge flood",
      },
      [],
      dryWeather
    );

    expect(analysis.anomalyAssessment.confidenceScore).toBeLessThan(70);
    expect(analysis.anomalyAssessment.anomalyFlags.length).toBeGreaterThan(0);
  });

  it("clusters pending reports and drafts bilingual CAP public advisory", () => {
    const reports: FloodReport[] = [
      {
        id: "r1",
        tileId: "t1",
        lat: 12.9265,
        lng: 77.6835,
        waterDepth: "WaistPlus",
        severityUser: "WaistPlus",
        description: "EcoSpace underpass completely submerged",
        createdAt: new Date().toISOString(),
        status: "Unverified",
      },
      {
        id: "r2",
        tileId: "t2",
        lat: 12.9275,
        lng: 77.684,
        waterDepth: "Knees",
        severityUser: "Knees",
        description: "Bellandur gate water pooling",
        createdAt: new Date().toISOString(),
        status: "Unverified",
      },
    ];

    const incidents: RoadIncident[] = [
      {
        id: "inc1",
        tileId: "t1",
        status: "ClosedAllTraffic",
        description: "Outer Ring Road EcoSpace Underpass Closed",
        lat: 12.9265,
        lng: 77.6835,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "Authority",
      },
    ];

    const shelters: Shelter[] = [
      {
        id: "sh1",
        name: "Bellandur Community Hall",
        address: "Outer Ring Road, Bellandur",
        lat: 12.9275,
        lng: 77.684,
        kind: "Community Hall",
        capacityStatus: "Space available",
        provenance: "Official Verified",
      },
    ];

    const triage = generateMunicipalTriageSummary(reports, incidents, mockWeather, shelters);

    expect(triage.clusters.length).toBeGreaterThanOrEqual(1);
    expect(triage.clusters[0].highestSeverity).toBe("WaistPlus");
    expect(triage.clusters[0].trend).toBe("Rapidly Deteriorating");
    expect(triage.severedEvacuationRoutes.length).toBe(1);
    expect(triage.draftedPublicAdvisory.titleEn).toContain("Critical");
    expect(triage.draftedPublicAdvisory.titleKn).toContain("ಎಚ್ಚರಿಕೆ");
  });

  it("records immutable workflow audit steps", () => {
    const log = recordWorkflowStep({
      reportId: "rep_audit_unit",
      stage: "HumanApproved",
      actor: "BBMP Ward Officer",
      details: "Confirmed WaistPlus flood report at Silk Board junction.",
    });

    expect(log.stage).toBe("HumanApproved");
    expect(log.actor).toBe("BBMP Ward Officer");
    expect(log.id).toBeDefined();

    const allLogs = getWorkflowAuditLogs();
    expect(allLogs.some((l) => l.reportId === "rep_audit_unit")).toBe(true);
  });
});
