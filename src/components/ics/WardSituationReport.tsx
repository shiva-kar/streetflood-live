import type { Tile } from "@/lib/flood/types";

export function WardSituationReport({ ward, tiles }: { ward: string; tiles: Tile[] }) {
  const wardTiles = tiles.filter((tile) => tile.ward === ward);
  const critical = wardTiles.filter((tile) => tile.currentRiskLevel === "Critical").length;
  const high = wardTiles.filter((tile) => tile.currentRiskLevel === "High").length;
  return <section aria-label={`${ward} situation report`} className="rounded-2xl border-2 p-4"><h2 className="font-bold">{ward} situation report</h2><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg border p-2"><strong>{wardTiles.length}</strong><span className="block text-xs text-muted-foreground">tiles</span></div><div className="rounded-lg border p-2 text-orange-600"><strong>{high}</strong><span className="block text-xs">high</span></div><div className="rounded-lg border p-2 text-red-600"><strong>{critical}</strong><span className="block text-xs">critical</span></div></div></section>;
}
