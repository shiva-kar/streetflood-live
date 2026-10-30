import { DEPTH_WEIGHT, RECENT_WINDOW_MIN } from "@/lib/flood/engine";
import type { FloodReport, Tile, WaterDepth } from "@/lib/flood/types";

export interface BreakdownDisplayItem {
  label: string;
  points: string;
}

export const DEPTH_DISPLAY_NAMES: Record<WaterDepth, string> = {
  Footpath: "Footpath",
  Ankles: "Ankle-deep",
  Knees: "Knee-deep",
  WaistPlus: "Waist-deep",
};

export const DEPTH_ORDER: WaterDepth[] = ["WaistPlus", "Knees", "Ankles", "Footpath"];

export function getEnrichedBreakdown(
  tile: Tile,
  reports: FloodReport[],
  now = Date.now(),
): BreakdownDisplayItem[] {
  // Find active, non-dismissed reports for this tile within RECENT_WINDOW_MIN
  const activeTileReports = reports.filter((r) => {
    if (r.tileId !== tile.id) return false;
    if (r.status === "Dismissed") return false;
    const t = Date.parse(r.createdAt);
    if (isNaN(t) || now - t > RECENT_WINDOW_MIN * 60000) return false;
    return true;
  });

  // Group active reports by status and depth
  const unverifiedByDepth = new Map<WaterDepth, number>();
  const verifiedByDepth = new Map<WaterDepth, number>();

  for (const r of activeTileReports) {
    if (r.status === "Verified") {
      verifiedByDepth.set(r.severityUser, (verifiedByDepth.get(r.severityUser) || 0) + 1);
    } else {
      unverifiedByDepth.set(r.severityUser, (unverifiedByDepth.get(r.severityUser) || 0) + 1);
    }
  }

  const unverifiedItems: BreakdownDisplayItem[] = [];
  for (const depth of DEPTH_ORDER) {
    const count = unverifiedByDepth.get(depth);
    if (!count) continue;
    const weight = DEPTH_WEIGHT[depth] ?? 1;
    const pts = Math.round(10 * weight * count);
    const reportWord = count === 1 ? "report" : "reports";
    const depthLabel = DEPTH_DISPLAY_NAMES[depth] || depth;
    unverifiedItems.push({
      label: `${count} unverified ${reportWord} (${depthLabel} ×${weight.toFixed(1)})`,
      points: `+${pts}`,
    });
  }

  const verifiedItems: BreakdownDisplayItem[] = [];
  for (const depth of DEPTH_ORDER) {
    const count = verifiedByDepth.get(depth);
    if (!count) continue;
    const weight = DEPTH_WEIGHT[depth] ?? 1;
    const pts = Math.round(20 * weight * count);
    const reportWord = count === 1 ? "report" : "reports";
    const depthLabel = DEPTH_DISPLAY_NAMES[depth] || depth;
    verifiedItems.push({
      label: `${count} verified ${reportWord} (${depthLabel} ×${weight.toFixed(1)})`,
      points: `+${pts}`,
    });
  }

  const result: BreakdownDisplayItem[] = [];

  for (const item of tile.severityBreakdown) {
    const isUnverified = /unverified report/i.test(item);
    const isVerified = /verified report/i.test(item);

    if (isUnverified) {
      if (unverifiedItems.length > 0) {
        result.push(...unverifiedItems);
      } else {
        const parts = item.split(":");
        result.push({ label: parts[0]?.trim() || item, points: parts[1]?.trim() || "" });
      }
    } else if (isVerified) {
      if (verifiedItems.length > 0) {
        result.push(...verifiedItems);
      } else {
        const parts = item.split(":");
        result.push({ label: parts[0]?.trim() || item, points: parts[1]?.trim() || "" });
      }
    } else {
      const parts = item.split(":");
      result.push({ label: parts[0]?.trim() || item, points: parts[1]?.trim() || "" });
    }
  }

  return result;
}
