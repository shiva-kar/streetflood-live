import { GRID, SHELTERS, ZONES, buildTiles, hash01, tileId } from "./data";
import type {
  AppState,
  FloodAlert,
  IncidentStatus,
  PredictedRiskLevel,
  RiskLevel,
  Tile,
  TileBase,
  WaterDepth,
} from "./types";

export const RECENT_WINDOW_MIN = 6 * 60;

export const DEPTH_WEIGHT: Record<WaterDepth, number> = {
  Footpath: 0.5,
  Ankles: 1,
  Knees: 1.5,
  WaistPlus: 2,
};
export const DEPTH_LABEL: Record<WaterDepth, string> = {
  Footpath: "Footpath level",
  Ankles: "Up to ankles",
  Knees: "Up to knees",
  WaistPlus: "Waist or higher",
};
export const INCIDENT_LABEL: Record<IncidentStatus, string> = {
  PartiallyFlooded: "Partially flooded",
  ClosedSmallVehicles: "Closed to small vehicles",
  ClosedAllTraffic: "Closed to all traffic",
};
const INCIDENT_SCORE: Record<IncidentStatus, number> = {
  PartiallyFlooded: 5,
  ClosedSmallVehicles: 10,
  ClosedAllTraffic: 15,
};

export function mapScoreToRisk(score: number): RiskLevel {
  if (score < 20) return "Low";
  if (score < 40) return "Moderate";
  if (score < 70) return "High";
  return "Critical";
}

/** Rule-based 3-hour prediction. Returns level plus human-readable reasons. */
export function predictRisk(input: {
  recentRain: number;
  forecastRain: number;
  isHotspot: boolean;
  drainageScore: number;
}): { level: PredictedRiskLevel; pressure: number; reasons: string[] } {
  const reasons: string[] = [];
  let pressure = 0;
  if (input.recentRain > 20) {
    pressure++;
    reasons.push(`High recent rainfall (${input.recentRain.toFixed(0)} mm last hour)`);
  }
  if (input.forecastRain > 30) {
    pressure++;
    reasons.push(`Heavy forecast (${input.forecastRain.toFixed(0)} mm next 3 h)`);
  }
  if (input.isHotspot) {
    pressure++;
    reasons.push("Known low-lying hotspot");
  }
  if (input.drainageScore < 35) {
    pressure++;
    reasons.push(`Poor drainage (score ${Math.round(input.drainageScore)}/100)`);
  }
  if (reasons.length === 0) reasons.push("Rainfall and drainage within normal range");
  return { level: pressure >= 2 ? "Moderate" : "Low", pressure, reasons };
}

let BASE: TileBase[] | null = null;
export function baseTiles() {
  if (!BASE) BASE = buildTiles();
  return BASE;
}

export function sensorLevelFor(t: TileBase, recentRain: number, drainage: number, tick: number) {
  if (!t.isHotspot) return 0; // sensors installed only at hotspots (simulated network)
  const wobble = (hash01(t.row, t.col, tick + 11) - 0.5) * 1.2;
  const raw = (recentRain / 12) * (1 - drainage / 120) + wobble;
  return Math.max(0, Math.min(4, Math.round(raw)));
}

export function computeTiles(state: AppState, now: number): Tile[] {
  const { sim } = state;
  const byTile = new Map<string, { v: number; u: number; vc: number; uc: number; last: number }>();
  for (const r of state.reports) {
    if (r.status === "Dismissed") continue;
    const t = Date.parse(r.createdAt);
    if (now - t > RECENT_WINDOW_MIN * 60000) continue;
    const e = byTile.get(r.tileId) ?? { v: 0, u: 0, vc: 0, uc: 0, last: 0 };
    const w = DEPTH_WEIGHT[r.severityUser];
    if (r.status === "Verified") {
      e.v += w;
      e.vc++;
    } else {
      e.u += w;
      e.uc++;
    }
    e.last = Math.max(e.last, t, r.reviewedAt ? Date.parse(r.reviewedAt) : 0);
    byTile.set(r.tileId, e);
  }
  const closures = new Map<string, { s: IncidentStatus; t: number }>();
  for (const i of state.incidents) {
    const prev = closures.get(i.tileId);
    if (!prev || INCIDENT_SCORE[i.status] > INCIDENT_SCORE[prev.s])
      closures.set(i.tileId, { s: i.status, t: Date.parse(i.updatedAt) });
  }
  const sensorTime = Date.parse(sim.lastSensorRefresh);

  return baseTiles().map((b) => {
    const drainage = Math.max(0, Math.min(100, b.drainageScore + sim.drainageOffset));
    const recent = sim.recentRainfall * b.rainFactor;
    const forecast = sim.forecastRainfall * b.rainFactor;
    const sensor = sensorLevelFor(b, recent, drainage, sim.tick);
    const rep = byTile.get(b.id);
    const cl = closures.get(b.id);
    const rainPts = Math.min(10, (recent / 10) * (1 - drainage / 150));
    const breakdown: string[] = [];
    let score = 0;
    if (rep?.u) {
      score += 10 * rep.u;
      breakdown.push(`${rep.uc} unverified report(s): +${Math.round(10 * rep.u)}`);
    }
    if (rep?.v) {
      score += 20 * rep.v;
      breakdown.push(`${rep.vc} verified report(s): +${Math.round(20 * rep.v)}`);
    }
    if (cl) {
      score += INCIDENT_SCORE[cl.s];
      breakdown.push(`${INCIDENT_LABEL[cl.s]}: +${INCIDENT_SCORE[cl.s]}`);
    }
    if (sensor) {
      score += 5 * sensor;
      breakdown.push(`Sensor level ${sensor}/4 (simulated): +${5 * sensor}`);
    }
    if (rainPts >= 1) {
      score += rainPts;
      breakdown.push(`Rainfall intensity (simulated): +${Math.round(rainPts)}`);
    }
    score = Math.min(100, Math.round(score));
    const pred = predictRisk({
      recentRain: recent,
      forecastRain: forecast,
      isHotspot: sim.useHotspots && b.isHotspot,
      drainageScore: drainage,
    });
    const last = Math.max(rep?.last ?? 0, cl?.t ?? 0, b.isHotspot ? sensorTime : 0);
    return {
      ...b,
      drainageScore: drainage,
      currentSeverityScore: score,
      currentRiskLevel: mapScoreToRisk(score),
      lastUpdated: new Date(last || sensorTime).toISOString(),
      sensorLevel: sensor,
      recentRainfallMmLastHour: recent,
      forecastRainfallNext3Hours: forecast,
      predictedRisk: pred.level,
      predictionReasons: pred.reasons,
      severityBreakdown: breakdown,
      closure: cl?.s,
      verifiedReports: rep?.vc ?? 0,
      unverifiedReports: rep?.uc ?? 0,
    };
  });
}

export function tileAt(lat: number, lng: number) {
  const row = Math.floor((lat - GRID.south) / GRID.dLat);
  const col = Math.floor((lng - GRID.west) / GRID.dLng);
  if (row < 0 || col < 0 || row >= GRID.rows || col >= GRID.cols) return null;
  return tileId(row, col);
}

export function tileBounds(row: number, col: number): [[number, number], [number, number]] {
  const s = GRID.south + row * GRID.dLat;
  const w = GRID.west + col * GRID.dLng;
  return [
    [s, w],
    [s + GRID.dLat, w + GRID.dLng],
  ];
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function sheltersByDistance(lat: number, lng: number) {
  return SHELTERS.map((s) => ({ ...s, distanceKm: distanceKm(lat, lng, s.lat, s.lng) })).sort(
    (a, b) => a.distanceKm - b.distanceKm,
  );
}

// ---------------- Routing (A* on the tile grid, 8-direction) ----------------

export const RISK_COST: Record<RiskLevel, number> = { Low: 1, Moderate: 2, High: 5, Critical: 60 };

export function tileCost(t: Tile): number {
  if (t.closure === "ClosedAllTraffic") return Infinity;
  let c = RISK_COST[t.currentRiskLevel];
  if (t.closure === "ClosedSmallVehicles") c += 10;
  return c;
}

export interface RouteResult {
  path: Tile[];
  distanceKm: number;
  minutes: number;
  counts: Record<RiskLevel, number>;
  closuresOnRoute: number;
  straightLineRisky: number;
}

export function planRoute(tiles: Tile[], fromId: string, toId: string): RouteResult | null {
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const start = byId.get(fromId);
  const goal = byId.get(toId);
  if (!start || !goal) return null;
  const key = (r: number, c: number) => r * GRID.cols + c;
  const grid: Tile[] = [];
  for (const t of tiles) grid[key(t.row, t.col)] = t;
  const h = (t: Tile) => Math.hypot(t.row - goal.row, t.col - goal.col);
  const g = new Map<number, number>([[key(start.row, start.col), 0]]);
  const came = new Map<number, number>();
  const open: { k: number; f: number }[] = [{ k: key(start.row, start.col), f: h(start) }];
  const closed = new Set<number>();
  const goalK = key(goal.row, goal.col);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (closed.has(cur.k)) continue;
    if (cur.k === goalK) break;
    closed.add(cur.k);
    const ct = grid[cur.k];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = ct.row + dr;
        const c = ct.col + dc;
        if (r < 0 || c < 0 || r >= GRID.rows || c >= GRID.cols) continue;
        const nk = key(r, c);
        if (closed.has(nk)) continue;
        const nt = grid[nk];
        const step = nk === goalK ? RISK_COST[nt.currentRiskLevel] : tileCost(nt);
        if (!isFinite(step)) continue;
        const ng = g.get(cur.k)! + step * (dr && dc ? Math.SQRT2 : 1);
        if (ng < (g.get(nk) ?? Infinity)) {
          g.set(nk, ng);
          came.set(nk, cur.k);
          open.push({ k: nk, f: ng + h(nt) });
        }
      }
    }
  }
  if (!g.has(goalK)) return null;
  const path: Tile[] = [];
  let k: number | undefined = goalK;
  while (k !== undefined) {
    path.unshift(grid[k]);
    k = came.get(k);
  }
  let dist = 0;
  for (let i = 1; i < path.length; i++)
    dist += distanceKm(
      path[i - 1].centerLat,
      path[i - 1].centerLng,
      path[i].centerLat,
      path[i].centerLng,
    );
  const counts: Record<RiskLevel, number> = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
  path.forEach((t) => counts[t.currentRiskLevel]++);
  // compare with straight line
  let straightLineRisky = 0;
  const n = Math.max(Math.abs(goal.row - start.row), Math.abs(goal.col - start.col));
  const seen = new Set<string>();
  for (let i = 0; i <= n; i++) {
    const r = Math.round(start.row + ((goal.row - start.row) * i) / (n || 1));
    const c = Math.round(start.col + ((goal.col - start.col) * i) / (n || 1));
    const t = byId.get(tileId(r, c));
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      if (
        t.currentRiskLevel === "High" ||
        t.currentRiskLevel === "Critical" ||
        t.closure === "ClosedAllTraffic"
      )
        straightLineRisky++;
    }
  }
  const slowFactor =
    1 + (counts.Moderate * 0.3 + counts.High * 1 + counts.Critical * 2) / Math.max(1, path.length);
  return {
    path,
    distanceKm: dist,
    minutes: Math.max(1, Math.round((dist / 18) * 60 * slowFactor)),
    counts,
    closuresOnRoute: path.filter((t) => t.closure).length,
    straightLineRisky,
  };
}

// ---------------- Alerts ----------------

/** Auto-generated advance warnings: one per zone containing Moderate predicted tiles. */
export function predictiveAlerts(tiles: Tile[], state: AppState, now: number): FloodAlert[] {
  return ZONES.flatMap((z) => {
    const mod = tiles.filter((t) => t.ward === z.key && t.predictedRisk === "Moderate");
    if (!mod.length || state.archivedPredictiveWards.includes(z.key)) return [];
    const hotspot = mod.some((t) => t.isHotspot);
    return [
      {
        id: `pred_${z.key}`,
        title: `Advance warning: ${z.label} may see waterlogging in next 3 h`,
        message: `${mod.length} tile(s) in ${z.label} have Moderate predicted risk${hotspot ? ", including known low-lying hotspots" : ""}. Move vehicles from low-lying spots and keep essentials ready. Simulated prediction – not for real emergency decisions.`,
        severity: mod.length > 25 ? "Warning" : "Info",
        type: "PredictiveSimulated",
        status: "Published",
        tileIds: mod.map((t) => t.id),
        wardLabel: z.label,
        createdAt: state.sim.lastSensorRefresh || new Date(now).toISOString(),
        publishedAt: state.sim.lastSensorRefresh,
      } satisfies FloodAlert,
    ];
  });
}

export function alertsForArea(alerts: FloodAlert[], tileIds: Set<string>) {
  return alerts.filter((a) => a.status === "Published" && a.tileIds.some((id) => tileIds.has(id)));
}

export function timeAgo(iso: string, now: number) {
  const m = Math.round((now - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
