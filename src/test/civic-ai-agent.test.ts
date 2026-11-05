import { describe, expect, it } from "vitest";
import { runBobCivicAgent, runCivicAiAgent } from "@/lib/ai/bengaluruAgent";
import type { FloodReport, RoadIncident } from "@/lib/flood/types";

describe("StreetFlood Civic AI Agentic Engine", () => {
  const mockUserPos: [number, number] = [12.9716, 77.5946]; // Bengaluru Center

  const mockIncidents: RoadIncident[] = [
    {
      id: "blr_i1",
      tileId: "t_blr_ecospace",
      status: "ClosedAllTraffic",
      description: "Outer Ring Road (EcoSpace underpass) submerged due to stormwater surge.",
      lat: 12.9265,
      lng: 77.6835,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Authority",
    },
    {
      id: "blr_i2",
      tileId: "t_blr_silkboard_inc",
      status: "ClosedSmallVehicles",
      description: "Closed to two-wheelers and autos near Central Silk Board junction underpass.",
      lat: 12.9172,
      lng: 77.6228,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Authority",
    },
  ];

  const mockReports: FloodReport[] = [
    {
      id: "blr_r1",
      tileId: "t_blr_silkboard",
      lat: 12.9175,
      lng: 77.6231,
      description: "Water accumulating near Silk Board junction bus shelter.",
      severityUser: "Knees",
      createdAt: new Date().toISOString(),
      status: "Verified",
    },
  ];

  it("identifies Outer Ring Road (EcoSpace) closure and marks verdict as Impassable", async () => {
    const res = await runBobCivicAgent("Is Outer Ring Road (EcoSpace) safe to drive right now?", {
      userPos: mockUserPos,
      weather: {
        recentRainMm: 24,
        rainRateMmPerHour: 28,
        forecastRain3hMm: 45,
        hourlyTimes: [],
        hourlyRainMm: [],
      },
      reports: mockReports,
      incidents: mockIncidents,
      activeCityName: "Bengaluru",
    });

    expect(res.status).toBe("Impassable");
    expect(res.headline).toContain("EcoSpace Underpass");
    expect(res.headlineKn).toContain("ಎಕೋಸ್ಪೇಸ್");
    expect(res.reasoningSteps.length).toBeGreaterThanOrEqual(3);
    expect(res.reasoningStepsKn.length).toBe(res.reasoningSteps.length);
    expect(res.suggestedActions.some((a) => a.id === "pan_orr")).toBe(true);
  });

  it("identifies Central Silk Board underpass restrictions and issues Caution verdict", async () => {
    const res = await runBobCivicAgent("What is the status of Central Silk Board junction?", {
      userPos: mockUserPos,
      weather: null,
      reports: mockReports,
      incidents: mockIncidents,
      activeCityName: "Bengaluru",
    });

    expect(res.status).toBe("Caution");
    expect(res.headline).toContain("Silk Board");
    expect(res.headlineKn).toContain("ಸಿಲ್ಕ್ ಬೋರ್ಡ್");
    expect(res.explanation).toContain("Madiwala");
    expect(res.suggestedActions.some((a) => a.id === "pan_silkboard")).toBe(true);
  });

  it("resolves nearest verified BBMP disaster shelter with actionable navigation action", async () => {
    const res = await runBobCivicAgent("Where is the nearest safe shelter for evacuation?", {
      userPos: mockUserPos, // [12.9716, 77.5946] -> Kanteerava is ~300m away
      weather: null,
      reports: mockReports,
      incidents: mockIncidents,
      activeCityName: "Bengaluru",
    });

    expect(res.status).toBe("Safe");
    expect(res.headline).toContain("Kanteerava");
    expect(res.headlineKn).toContain("ಸಮೀಪದ ಆಶ್ರಯ");
    expect(res.reasoningSteps.some((step) => step.includes("Haversine"))).toBe(true);
    expect(res.suggestedActions.some((a) => a.type === "navigate")).toBe(true);
  });

  it("retrieves official BBMP disaster helpline numbers (1533 and 112)", async () => {
    const res = await runBobCivicAgent("What emergency number should I call for flooded streets?", {
      userPos: mockUserPos,
      weather: null,
      reports: mockReports,
      incidents: mockIncidents,
      activeCityName: "Bengaluru",
    });

    expect(res.explanation).toContain("1533");
    expect(res.explanation).toContain("112");
    expect(res.suggestedActions.some((a) => a.phone === "1533")).toBe(true);
    expect(res.suggestedActions.some((a) => a.phone === "112")).toBe(true);
  });
});
