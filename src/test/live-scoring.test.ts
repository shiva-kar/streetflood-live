import { describe, expect, it } from "vitest";
import {
  canSendReport,
  findDuplicate,
  levelFromScore,
  rainOutlook,
  reportWeight,
  routeRisk,
  spotScore,
  type ScoredReport,
} from "@/lib/live/scoring";

const NOW = Date.parse("2026-10-31T12:00:00Z");
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();
const rep = (p: Partial<ScoredReport> = {}): ScoredReport => ({
  id: "r",
  lat: 19.05,
  lng: 72.87,
  depth: "knee",
  status: "pending",
  createdAt: ago(0),
  confirms: 0,
  clears: 0,
  ...p,
});

describe("live scoring rules", () => {
  it("reports older than 6 hours no longer count", () => {
    expect(reportWeight(rep({ createdAt: ago(6 * 60) }), NOW)).toBe(0);
    expect(reportWeight(rep({ createdAt: ago(5 * 60) }), NOW)).toBeGreaterThan(0);
  });
  it("dismissed reports are ignored", () => {
    expect(reportWeight(rep({ status: "dismissed" }), NOW)).toBe(0);
  });
  it("verified reports count double", () => {
    expect(reportWeight(rep({ status: "verified" }), NOW)).toBe(2 * reportWeight(rep(), NOW));
  });
  it("more 'water has gone' votes than confirmations removes the report", () => {
    expect(reportWeight(rep({ confirms: 1, clears: 2 }), NOW)).toBe(0);
  });
  it("a road closure is always the top score", () => {
    expect(spotScore([], NOW, true)).toBe(100);
    expect(levelFromScore(100, true)).toBe("closed");
  });
  it("one fresh knee-deep report means 'avoid'", () => {
    expect(levelFromScore(spotScore([rep()], NOW))).toBe("avoid");
  });
  it("limits a person to 5 reports per hour", () => {
    expect(canSendReport([ago(1), ago(2), ago(3), ago(4)], NOW)).toBe(true);
    expect(canSendReport([ago(1), ago(2), ago(3), ago(4), ago(5)], NOW)).toBe(false);
    expect(canSendReport([ago(61), ago(62), ago(63), ago(64), ago(65)], NOW)).toBe(true);
  });
  it("treats a report within 50 m and 30 min as a duplicate", () => {
    expect(findDuplicate([rep()], 19.0503, 72.87, NOW)).toBeDefined(); // ~33 m
    expect(findDuplicate([rep()], 19.051, 72.87, NOW)).toBeUndefined(); // ~111 m
    expect(findDuplicate([rep({ createdAt: ago(31) })], 19.05, 72.87, NOW)).toBeUndefined();
  });
  it("3-hour rain outlook thresholds", () => {
    expect(rainOutlook(0, 5)).toBe("none");
    expect(rainOutlook(0, 12)).toBe("possible");
    expect(rainOutlook(0, 30)).toBe("likely");
    expect(rainOutlook(8, 16)).toBe("likely");
  });
  it("a route passing a closure is marked closed", () => {
    const r = routeRisk([[19.05, 72.87], [19.06, 72.87]], [], [{ lat: 19.05, lng: 72.87 }], NOW);
    expect(r.level).toBe("closed");
  });
});
