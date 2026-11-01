import type { DispatchResource } from "@/lib/ics/dispatchEngine";

export function ResourceTracker({ resources }: { resources: DispatchResource[] }) {
  return <section aria-label="Emergency resource tracker" className="rounded-2xl border-2 p-4"><h2 className="font-bold">Resource tracker</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{resources.map((resource) => <div key={resource.id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><strong>{resource.id}</strong><span className={resource.available ? "text-emerald-600" : "text-red-600"}>{resource.available ? "Available" : "Deployed"}</span></div><p className="text-muted-foreground">{resource.type}{resource.capacity ? ` · ${resource.capacity}` : ""}</p></div>)}</div></section>;
}
