import type { FloodReport, IncidentStatus, RiskLevel, RoadIncident, Tile } from "./types";
import { SION_KURLA_OSM_ROADS } from "./osmNetwork";

export const CELL_DLAT = 0.0009; // ≈ 100m north-south

export function getDLngForLat(lat: number): number {
  const rad = (Math.abs(lat) * Math.PI) / 180;
  const cos = Math.max(0.2, Math.cos(rad));
  return 0.0009 / cos; // ≈ 100m east-west
}

export function snapCoordToGrid(
  lat: number,
  lng: number,
): { row: number; col: number; centerLat: number; centerLng: number; id: string } {
  const dLng = getDLngForLat(lat);
  const row = Math.floor(lat / CELL_DLAT);
  const col = Math.floor(lng / dLng);
  const centerLat = (row + 0.5) * CELL_DLAT;
  const centerLng = (col + 0.5) * dLng;
  const id = `t_${row}_${col}`;
  return { row, col, centerLat, centerLng, id };
}

export function tileIdFromLatLng(lat: number, lng: number): string {
  return snapCoordToGrid(lat, lng).id;
}

export interface CivicSafetyStatus {
  headline: string;
  subhead: string;
  badgeClass: string;
  colorHex: string;
}

export function getCivicSafetyStatus(
  score: number,
  closure?: IncidentStatus,
  hasWaistWater?: boolean,
): CivicSafetyStatus {
  if (closure === "ClosedAllTraffic" || score >= 70 || hasWaistWater) {
    return {
      headline: "Danger: Closed / Impassable",
      subhead: "Deep water or road closure. Do not enter. Seek shelter or detour.",
      badgeClass: "bg-red-500 text-white border-red-600",
      colorHex: "#ef4444",
    };
  }
  if (closure === "ClosedSmallVehicles" || score >= 40) {
    return {
      headline: "Avoid: Deep Water",
      subhead: "Knee-deep water. Small cars and 2-wheelers risk engine stalling.",
      badgeClass: "bg-orange-500 text-white border-orange-600",
      colorHex: "#f97316",
    };
  }
  if (score >= 20 || closure === "PartiallyFlooded") {
    return {
      headline: "Caution: Water on Road",
      subhead: "Ankle-deep puddles. Walk carefully; watch for submerged curbs.",
      badgeClass: "bg-amber-500 text-white border-amber-600",
      colorHex: "#f59e0b",
    };
  }
  return {
    headline: "Safe: Clear Conditions",
    subhead: "Roads are clear and passable with normal conditions.",
    badgeClass: "bg-emerald-600 text-white border-emerald-700",
    colorHex: "#10b981",
  };
}

export const DEPTH_POINTS: Record<string, number> = {
  Footpath: 10,
  Ankles: 25,
  Knees: 50,
  WaistPlus: 75,
};

export const RECENT_WINDOW_HOURS = 6;

/**
 * Dynamically generates ~100m grid tiles for the current viewport bounding box.
 * Automatically limits tile count to maintain 60 FPS on mobile.
 */
export function resolveLocalityAndWard(lat: number, lng: number): { locality: string; ward: string } {
  // Bengaluru primary civic corridor bounds (~12.85 to 13.08 N, 77.50 to 77.75 E)
  if (lat >= 12.85 && lat <= 13.08 && lng >= 77.50 && lng <= 77.75) {
    if (lat >= 12.955 && lng >= 77.57 && lng <= 77.62) {
      return { locality: "CBD / MG Road / Richmond Circle", ward: "Central Zone (BBMP)" };
    }
    if (lat >= 12.95 && lng >= 77.62 && lng <= 77.68) {
      return { locality: "Indiranagar 100ft Road / Domlur", ward: "East Zone (BBMP)" };
    }
    if (lat >= 12.92 && lat <= 12.955 && lng >= 77.60 && lng <= 77.645) {
      return { locality: "Koramangala 80ft Road / NGV Belt", ward: "South Zone (BBMP)" };
    }
    if (lat <= 12.925 && lng >= 77.61 && lng <= 77.65) {
      return { locality: "Central Silk Board & HSR Layout", ward: "Bommanahalli Zone (BBMP)" };
    }
    if (lng >= 77.66) {
      return { locality: "Outer Ring Road (Bellandur / EcoSpace tech corridor)", ward: "Mahadevapura Zone (BBMP)" };
    }
    if (lng <= 77.56) {
      return { locality: "Rajajinagar / Vijayanagar Corridor", ward: "West Zone (BBMP)" };
    }
    return { locality: "Bengaluru Urban Corridor", ward: "BBMP Monitored Zone" };
  }

  // Sion–Kurla corridor bounds in Mumbai
  if (lat >= 19.025 && lat <= 19.085 && lng >= 72.845 && lng <= 72.895) {
    let closestRoad = "";
    let minD = 0.0035; // ~350m
    for (const r of SION_KURLA_OSM_ROADS) {
      if (!r.name || r.name.startsWith("Unnamed")) continue;
      const c = r.coordinates[0];
      const d = Math.hypot(lat - c[0], lng - c[1]);
      if (d < minD) {
        minD = d;
        closestRoad = r.name;
      }
    }

    const ward =
      lat >= 19.055
        ? "Kurla (L Ward)"
        : lat <= 19.04
        ? "Sion (F-North Ward)"
        : "Chunabhatti / L Ward";

    if (closestRoad) {
      return { locality: closestRoad, ward };
    }

    const defaultLocality =
      lat >= 19.055
        ? "Kurla West Corridor"
        : lat <= 19.04
        ? "Sion Circle Corridor"
        : "Chunabhatti / SCLR";

    return { locality: defaultLocality, ward };
  }

  return {
    locality: "Disaster Response Sector",
    ward: "Monitored Region",
  };
}

export function generateViewportTiles(
  bbox: { south: number; west: number; north: number; east: number },
  reports: FloodReport[],
  incidents: RoadIncident[],
  recentRainMm = 0,
  forecastRain3hMm = 0,
  now = Date.now(),
): Tile[] {
  const centerLat = (bbox.south + bbox.north) / 2;
  const dLng = getDLngForLat(centerLat);

  // Determine span
  const latSpan = Math.abs(bbox.north - bbox.south);
  const lngSpan = Math.abs(bbox.east - bbox.west);

  // If zoomed out too far (> ~15km), limit bounding box generation around center to avoid memory spikes
  const maxSpan = 0.05; // ~5.5 km box
  const effSouth = latSpan > maxSpan ? centerLat - maxSpan / 2 : bbox.south;
  const effNorth = latSpan > maxSpan ? centerLat + maxSpan / 2 : bbox.north;
  const effWest = lngSpan > maxSpan ? (bbox.west + bbox.east) / 2 - maxSpan / 2 : bbox.west;
  const effEast = lngSpan > maxSpan ? (bbox.west + bbox.east) / 2 + maxSpan / 2 : bbox.east;

  const minRow = Math.floor(effSouth / CELL_DLAT);
  const maxRow = Math.ceil(effNorth / CELL_DLAT);
  const minCol = Math.floor(effWest / dLng);
  const maxCol = Math.ceil(effEast / dLng);

  // Index active reports by snapped tile ID
  const reportsByTile = new Map<string, FloodReport[]>();
  for (const r of reports) {
    if (r.status === "Dismissed") continue;
    const t = Date.parse(r.createdAt);
    if (isNaN(t) || now - t > RECENT_WINDOW_HOURS * 3600 * 1000) continue;

    const tid = tileIdFromLatLng(r.lat, r.lng);
    const existing = reportsByTile.get(tid) || [];
    existing.push(r);
    reportsByTile.set(tid, existing);
  }

  // Index active incidents by snapped tile ID
  const incidentsByTile = new Map<string, RoadIncident>();
  for (const inc of incidents) {
    const tid = tileIdFromLatLng(inc.lat, inc.lng);
    incidentsByTile.set(tid, inc);
  }

  const tiles: Tile[] = [];

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const tileLat = (r + 0.5) * CELL_DLAT;
      const tileLng = (c + 0.5) * dLng;
      const id = `t_${r}_${c}`;

      const tileReports = reportsByTile.get(id) || [];
      const incident = incidentsByTile.get(id);

      let score = 0;
      const breakdown: string[] = [];
      let verifiedCount = 0;
      let unverifiedCount = 0;
      let hasWaistWater = false;

      // 1. Evaluate reports with recency decay and community vote multiplier
      for (const rep of tileReports) {
        const isVerified = rep.status === "Verified";
        if (isVerified) verifiedCount++;
        else unverifiedCount++;

        if (rep.severityUser === "WaistPlus") hasWaistWater = true;

        const basePoints = DEPTH_POINTS[rep.severityUser] || 15;
        const repTime = Date.parse(rep.createdAt);
        const ageHours = Math.max(0, (now - repTime) / (3600 * 1000));
        // Linear decay over 6 hours: 1.0 at 0h down to 0.1 at 6h
        const decay = Math.max(0.1, 1 - ageHours / RECENT_WINDOW_HOURS);

        // Community consensus multiplier: +20% per confirm vote, -30% per cleared vote
        const confirms = rep.confirmVotes || 0;
        const cleared = rep.clearedVotes || 0;
        const voteMult = Math.max(0.2, 1 + Math.min(5, confirms) * 0.2 - cleared * 0.3);

        const repScore = Math.round(basePoints * decay * voteMult * (isVerified ? 1.4 : 0.8));
        score += repScore;

        const statusLabel = isVerified ? "Verified report" : "Community report";
        breakdown.push(
          `${statusLabel} (${rep.severityUser}, ${ageHours.toFixed(1)}h ago): +${repScore}`,
        );
      }

      // 2. Evaluate road incident closures
      if (incident) {
        if (incident.status === "ClosedAllTraffic") {
          score = Math.max(score, 75);
          breakdown.push(`Official Road Closure (Closed to all traffic): +75`);
        } else if (incident.status === "ClosedSmallVehicles") {
          score = Math.max(score, 45);
          breakdown.push(`Vehicle Restriction (Closed to small vehicles): +45`);
        } else if (incident.status === "PartiallyFlooded") {
          score = Math.max(score, 25);
          breakdown.push(`Waterlogging Advisory: +25`);
        }
      }

      // 3. Real rainfall factor
      if (recentRainMm > 15) {
        const rainBonus = Math.min(25, Math.round((recentRainMm - 15) * 0.8));
        score += rainBonus;
        breakdown.push(`Heavy live rainfall (${recentRainMm} mm/h): +${rainBonus}`);
      }

      const finalScore = Math.min(100, Math.max(0, score));

      let currentRisk: RiskLevel = "Low";
      if (finalScore >= 70 || incident?.status === "ClosedAllTraffic") currentRisk = "Critical";
      else if (finalScore >= 40) currentRisk = "High";
      else if (finalScore >= 20) currentRisk = "Moderate";

      // 3-hour predictive calculation
      const predictedPressure =
        (recentRainMm > 20 ? 1 : 0) + (forecastRain3hMm > 25 ? 1 : 0) + (finalScore >= 30 ? 1 : 0);

      const { locality, ward } = resolveLocalityAndWard(tileLat, tileLng);

      tiles.push({
        id,
        row: r,
        col: c,
        centerLat: tileLat,
        centerLng: tileLng,
        ward,
        locality,
        isHotspot: finalScore >= 40,
        drainageScore: 50,
        rainFactor: 1.0,
        currentSeverityScore: finalScore,
        currentRiskLevel: currentRisk,
        lastUpdated: new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sensorLevel: 0,
        recentRainfallMmLastHour: recentRainMm,
        forecastRainfallNext3Hours: forecastRain3hMm,
        predictedRisk: predictedPressure >= 2 ? "Moderate" : "Low",
        predictionReasons:
          predictedPressure >= 2
            ? [`Heavy forecast (${forecastRain3hMm} mm in next 3h)`, "Recent saturation"]
            : ["Normal conditions expected"],
        severityBreakdown:
          breakdown.length > 0 ? breakdown : ["Normal conditions. No waterlogging reported."],
        closure: incident?.status,
        verifiedReports: verifiedCount,
        unverifiedReports: unverifiedCount,
      });
    }
  }

  return tiles;
}
