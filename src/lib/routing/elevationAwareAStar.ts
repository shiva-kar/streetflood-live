import type { EvacuationMode } from "@/lib/flood/types";
import { EVACUATION_PROFILES } from "./multiModalRouter";

export interface TerrainNode {
  id: string;
  lat: number;
  lng: number;
  elevationMeters: number;
  waterDepthCm: number;
  risk: "Low" | "Moderate" | "High" | "Critical" | "Closed";
  surface: "road" | "footpath" | "footbridge" | "skywalk" | "railway" | "underpass";
  neighbours: string[];
}

export interface TerrainRoute {
  nodeIds: string[];
  distanceMeters: number;
  elevationGainMeters: number;
  maximumWaterDepthCm: number;
  cost: number;
}

const riskPenalty = { Low: 1, Moderate: 3, High: 12, Critical: 100, Closed: Infinity } as const;

function haversineMeters(a: Pick<TerrainNode, "lat" | "lng">, b: Pick<TerrainNode, "lat" | "lng">) {
  const radius = 6_371_000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(x));
}

function canTraverse(node: TerrainNode, mode: EvacuationMode) {
  const profile = EVACUATION_PROFILES[mode];
  if (node.risk === "Closed" || node.waterDepthCm > profile.maxWaterDepthCm) return false;
  if (mode !== "pedestrian" && ["footpath", "footbridge", "skywalk", "railway"].includes(node.surface)) return false;
  if (profile.rejectsSubways && node.surface === "underpass") return false;
  return true;
}

export function elevationAwareAStar(nodes: TerrainNode[], startId: string, goalId: string, mode: EvacuationMode): TerrainRoute | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const start = byId.get(startId);
  const goal = byId.get(goalId);
  if (!start || !goal || !canTraverse(start, mode) || !canTraverse(goal, mode)) return null;

  const open = new Set([start.id]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[start.id, 0]]);
  const fScore = new Map<string, number>([[start.id, haversineMeters(start, goal)]]);

  while (open.size) {
    const current = [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity))[0]!;
    if (current === goal.id) {
      const path: string[] = [current];
      while (cameFrom.has(path[0]!)) path.unshift(cameFrom.get(path[0]!)!);
      const routeNodes = path.map((id) => byId.get(id)!);
      return routeNodes.slice(1).reduce<TerrainRoute>((route, node, index) => {
        const previous = routeNodes[index]!;
        const distance = haversineMeters(previous, node);
        const elevationGain = Math.max(0, node.elevationMeters - previous.elevationMeters);
        return {
          nodeIds: [...route.nodeIds, node.id],
          distanceMeters: route.distanceMeters + distance,
          elevationGainMeters: route.elevationGainMeters + elevationGain,
          maximumWaterDepthCm: Math.max(route.maximumWaterDepthCm, node.waterDepthCm),
          cost: route.cost + distance + riskPenalty[node.risk] * distance / 100 + elevationGain * 4,
        };
      }, { nodeIds: [start.id], distanceMeters: 0, elevationGainMeters: 0, maximumWaterDepthCm: start.waterDepthCm, cost: 0 });
    }

    open.delete(current);
    const currentNode = byId.get(current)!;
    for (const neighbourId of currentNode.neighbours) {
      const neighbour = byId.get(neighbourId);
      if (!neighbour || !canTraverse(neighbour, mode)) continue;
      const distance = haversineMeters(currentNode, neighbour);
      const elevationGain = Math.max(0, neighbour.elevationMeters - currentNode.elevationMeters);
      const tentative = (gScore.get(current) ?? Infinity) + distance + riskPenalty[neighbour.risk] * distance / 100 + elevationGain * 4;
      if (tentative < (gScore.get(neighbour.id) ?? Infinity)) {
        cameFrom.set(neighbour.id, current);
        gScore.set(neighbour.id, tentative);
        fScore.set(neighbour.id, tentative + haversineMeters(neighbour, goal));
        open.add(neighbour.id);
      }
    }
  }
  return null;
}
