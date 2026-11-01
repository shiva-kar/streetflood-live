import type { EvacuationMode, RoadRouteResult } from "@/lib/flood/types";

export const EVACUATION_PROFILES: Record<EvacuationMode, {
  maxWaterDepthCm: number;
  osrmProfile: "foot" | "driving";
  allowsFootpaths: boolean;
  rejectsSubways: boolean;
}> = {
  pedestrian: { maxWaterDepthCm: 15, osrmProfile: "foot", allowsFootpaths: true, rejectsSubways: false },
  twowheeler: { maxWaterDepthCm: 12, osrmProfile: "driving", allowsFootpaths: false, rejectsSubways: true },
  car: { maxWaterDepthCm: 22, osrmProfile: "driving", allowsFootpaths: false, rejectsSubways: true },
  heavyRescue: { maxWaterDepthCm: 60, osrmProfile: "driving", allowsFootpaths: false, rejectsSubways: false },
};

export function isRouteAllowedForMode(route: RoadRouteResult, mode: EvacuationMode) {
  const profile = EVACUATION_PROFILES[mode];
  return route.safetyStatus !== "Impassable" && !(profile.rejectsSubways && route.dangerWarnings.some((warning) => /subway|underpass/i.test(warning)));
}

export function chooseSafestRoute(routes: RoadRouteResult[], mode: EvacuationMode) {
  return routes
    .filter((route) => isRouteAllowedForMode(route, mode))
    .sort((a, b) => b.safetyScore - a.safetyScore || a.distanceKm - b.distanceKm)[0] ?? null;
}
