/** Pure, testable flood scoring rules. No network, no browser APIs. */

export type Depth = "footpath" | "ankle" | "knee" | "waist";
export type ReportStatus = "pending" | "verified" | "dismissed";
export type StreetLevel = "clear" | "water" | "avoid" | "danger" | "closed";

export interface ScoredReport {
  id: string;
  lat: number;
  lng: number;
  depth: Depth;
  status: ReportStatus;
  createdAt: string;
  confirms: number;
  clears: number;
}

/** Reports stop counting after this many hours. */
export const REPORT_LIFETIME_HOURS = 6;
/** Max reports one person can send per hour. */
export const REPORTS_PER_HOUR_LIMIT = 5;
/** Reports closer than this (metres) and within 30 min are treated as duplicates. */
export const DUPLICATE_RADIUS_M = 50;

export const DEPTH_POINTS: Record<Depth, number> = { footpath: 1, ankle: 2, knee: 3, waist: 4 };

export const DEPTH_LABEL: Record<Depth, string> = {
  footpath: "Puddles on the footpath",
  ankle: "Ankle-deep",
  knee: "Knee-deep",
  waist: "Waist-deep or more",
};

export const LEVEL_TEXT: Record<StreetLevel, { title: string; advice: string }> = {
  clear: { title: "No flooding reported", advice: "Roads look normal. Stay alert if it keeps raining." },
  water: { title: "Water on the road", advice: "Walk and drive slowly. Avoid open drains and manholes." },
  avoid: { title: "Avoid this street", advice: "Deep water reported. Use another route if you can." },
  danger: { title: "Dangerous flooding", advice: "Do not walk or drive through. Move to higher ground." },
  closed: { title: "Road closed", advice: "Closed by authorities. Choose another route." },
};

/** How much one report counts right now (0 = ignored). */
export function reportWeight(r: ScoredReport, now: number): number {
  if (r.status === "dismissed") return 0;
  const ageH = (now - Date.parse(r.createdAt)) / 3_600_000;
  if (ageH < 0 || ageH >= REPORT_LIFETIME_HOURS) return 0;
  if (r.clears > r.confirms) return 0; // community says the water has gone
  const freshness = 1 - ageH / REPORT_LIFETIME_HOURS;
  const trust = r.status === "verified" ? 2 : 1 + 0.25 * Math.min(r.confirms, 4);
  return DEPTH_POINTS[r.depth] * freshness * trust;
}

/** 0–100 score for a spot from nearby reports. */
export function spotScore(reports: ScoredReport[], now: number, closed = false): number {
  if (closed) return 100;
  const sum = reports.reduce((s, r) => s + reportWeight(r, now), 0);
  return Math.min(100, Math.round(sum * 12));
}

export function levelFromScore(score: number, closed = false): StreetLevel {
  if (closed) return "closed";
  if (score < 8) return "clear";
  if (score < 30) return "water";
  if (score < 60) return "avoid";
  return "danger";
}

export type Outlook = "none" | "possible" | "likely";

/** Rain outlook for the next 3 hours. */
export function rainOutlook(rainNowMm: number, next3hMm: number): Outlook {
  if (next3hMm >= 30 || (next3hMm >= 15 && rainNowMm >= 7)) return "likely";
  if (next3hMm >= 10 || rainNowMm >= 5) return "possible";
  return "none";
}

export const OUTLOOK_TEXT: Record<Outlook, string> = {
  none: "Little or no rain expected in the next 3 hours.",
  possible: "Rain may cause water on low-lying roads in the next 3 hours.",
  likely: "Heavy rain expected — waterlogging is likely in low-lying streets.",
};

/** Whether a user is allowed to send another report. */
export function canSendReport(myReportTimes: string[], now: number): boolean {
  const recent = myReportTimes.filter((t) => now - Date.parse(t) < 3_600_000);
  return recent.length < REPORTS_PER_HOUR_LIMIT;
}

export function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Find an existing fresh report this new one duplicates. */
export function findDuplicate<T extends ScoredReport>(
  reports: T[],
  lat: number,
  lng: number,
  now: number,
): T | undefined {
  return reports.find(
    (r) =>
      r.status !== "dismissed" &&
      now - Date.parse(r.createdAt) < 30 * 60_000 &&
      metresBetween(lat, lng, r.lat, r.lng) <= DUPLICATE_RADIUS_M,
  );
}

/** ~100 m street cells anywhere on Earth. */
export const CELL_DEG = 0.0009;
export function cellKey(lat: number, lng: number) {
  const r = Math.floor(lat / CELL_DEG);
  const lngStep = CELL_DEG / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const c = Math.floor(lng / lngStep);
  return { key: `${r}:${c}`, south: r * CELL_DEG, west: c * lngStep, dLat: CELL_DEG, dLng: lngStep };
}

export interface Cell {
  key: string;
  bounds: [[number, number], [number, number]];
  score: number;
  level: StreetLevel;
  count: number;
}

export function buildCells(reports: ScoredReport[], closures: { lat: number; lng: number }[], now: number): Cell[] {
  const groups = new Map<string, { info: ReturnType<typeof cellKey>; reps: ScoredReport[]; closed: boolean }>();
  const add = (lat: number, lng: number) => {
    const info = cellKey(lat, lng);
    let g = groups.get(info.key);
    if (!g) groups.set(info.key, (g = { info, reps: [], closed: false }));
    return g;
  };
  for (const r of reports) if (reportWeight(r, now) > 0) add(r.lat, r.lng).reps.push(r);
  for (const c of closures) add(c.lat, c.lng).closed = true;
  return [...groups.values()].map(({ info, reps, closed }) => {
    const score = spotScore(reps, now, closed);
    return {
      key: info.key,
      bounds: [
        [info.south, info.west],
        [info.south + info.dLat, info.west + info.dLng],
      ],
      score,
      level: levelFromScore(score, closed),
      count: reps.length,
    };
  });
}

/** Score a whole route: worst level it passes within 40 m of. */
export function routeRisk(
  coords: [number, number][],
  reports: ScoredReport[],
  closures: { lat: number; lng: number }[],
  now: number,
): { level: StreetLevel; hits: number } {
  const order: StreetLevel[] = ["clear", "water", "avoid", "danger", "closed"];
  let worst = 0;
  let hits = 0;
  const step = Math.max(1, Math.floor(coords.length / 400));
  const live = reports.filter((r) => reportWeight(r, now) > 0);
  for (let i = 0; i < coords.length; i += step) {
    const [lat, lng] = coords[i];
    if (closures.some((c) => metresBetween(lat, lng, c.lat, c.lng) < 40)) {
      worst = 4;
      hits++;
      continue;
    }
    const near = live.filter((r) => metresBetween(lat, lng, r.lat, r.lng) < 40);
    if (near.length) {
      hits++;
      worst = Math.max(worst, order.indexOf(levelFromScore(spotScore(near, now))));
    }
  }
  return { level: order[worst], hits };
}
