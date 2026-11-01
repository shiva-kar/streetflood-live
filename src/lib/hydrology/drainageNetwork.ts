import { calculateRunoff, type RunoffResult } from "./runoffModel";

export interface DrainageNode {
  id: string;
  lat: number;
  lng: number;
  elevationMeters: number;
  storageCubicMeters: number;
  maxDischargeCubicMetersPerSecond: number;
  isGate?: boolean;
}

export interface DrainageLink {
  from: string;
  to: string;
  lengthMeters: number;
  capacityCubicMetersPerSecond: number;
  roughnessManningN: number;
}

export interface DrainageState {
  nodeId: string;
  inflowCubicMetersPerSecond: number;
  outflowCubicMetersPerSecond: number;
  storedCubicMeters: number;
  waterLevelMeters: number;
  backflowCubicMetersPerSecond: number;
  surcharge: boolean;
}

export function manningDischarge(
  hydraulicRadiusMeters: number,
  crossSectionSquareMeters: number,
  slope: number,
  roughnessManningN: number,
) {
  if (hydraulicRadiusMeters <= 0 || crossSectionSquareMeters <= 0 || slope <= 0 || roughnessManningN <= 0) return 0;
  return (1 / roughnessManningN) * crossSectionSquareMeters * hydraulicRadiusMeters ** (2 / 3) * Math.sqrt(slope);
}

export function calculateDrainageStep(
  nodes: DrainageNode[],
  links: DrainageLink[],
  runoffByNode: Record<string, RunoffResult>,
  previous: Record<string, DrainageState> = {},
  options: { seconds?: number; tideMeters?: number; gateClosureMeters?: number } = {},
) {
  const seconds = options.seconds ?? 300;
  const tideMeters = options.tideMeters ?? 0;
  const gateClosureMeters = options.gateClosureMeters ?? 4.2;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const link of links) {
    const source = byId.get(link.from);
    const target = byId.get(link.to);
    if (!source || !target) continue;
    const available = previous[link.from]?.storedCubicMeters ?? 0;
    const flow = Math.min(link.capacityCubicMetersPerSecond, available / seconds);
    outgoing.set(link.from, (outgoing.get(link.from) ?? 0) + flow);
    incoming.set(link.to, (incoming.get(link.to) ?? 0) + flow);
  }
  return nodes.map((node) => {
    const runoff = runoffByNode[node.id]?.dischargeCubicMetersPerSecond ?? 0;
    const backflow = node.isGate && tideMeters >= gateClosureMeters ? Math.min(node.maxDischargeCubicMetersPerSecond, runoff) : 0;
    const inflow = runoff + (incoming.get(node.id) ?? 0) + backflow;
    const outflow = Math.min(node.maxDischargeCubicMetersPerSecond, outgoing.get(node.id) ?? 0);
    const stored = Math.max(0, Math.min(node.storageCubicMeters, (previous[node.id]?.storedCubicMeters ?? 0) + (inflow - outflow) * seconds));
    return {
      nodeId: node.id,
      inflowCubicMetersPerSecond: inflow,
      outflowCubicMetersPerSecond: outflow,
      storedCubicMeters: stored,
      waterLevelMeters: node.storageCubicMeters > 0 ? stored / node.storageCubicMeters : 0,
      backflowCubicMetersPerSecond: backflow,
      surcharge: stored >= node.storageCubicMeters || inflow > node.maxDischargeCubicMetersPerSecond,
    } satisfies DrainageState;
  });
}

export function runoffForNodes(
  nodes: DrainageNode[],
  rainfallMmPerHour: number,
  imperviousFraction: number,
  soilPermeability: number,
) {
  return Object.fromEntries(nodes.map((node) => [
    node.id,
    calculateRunoff({
      rainfallMmPerHour,
      areaSquareMeters: 100,
      imperviousFraction,
      soilPermeability,
    }),
  ]));
}
