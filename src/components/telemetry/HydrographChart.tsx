import { useMemo } from "react";

export function HydrographChart({ depths, rainfall }: { depths: number[]; rainfall: number[] }) {
  const max = useMemo(() => Math.max(1, ...depths, ...rainfall), [depths, rainfall]);
  return <div role="img" aria-label="Hydrograph showing depth and rainfall" className="flex h-40 items-end gap-1 rounded-xl border-2 bg-slate-950 p-3">{depths.map((depth, index) => <div key={index} className="flex h-full flex-1 items-end gap-0.5"><span className="w-1/2 rounded-t bg-cyan-400" style={{ height: `${depth / max * 100}%` }} /><span className="w-1/2 rounded-t bg-amber-400" style={{ height: `${(rainfall[index] ?? 0) / max * 100}%` }} /></div>)}</div>;
}
