import { useMemo } from "react";
import type { FloodAlert, FloodReport, RoadIncident } from "@/lib/flood/types";
import { INCIDENT_LIFECYCLE, type DispatchIncident } from "@/lib/ics/dispatchEngine";

export function IncidentCommandDashboard({ reports, incidents, alerts }: { reports: FloodReport[]; incidents: RoadIncident[]; alerts: FloodAlert[] }) {
  const criticalReports = useMemo(() => reports.filter((report) => report.status !== "Dismissed" && report.severityUser === "WaistPlus"), [reports]);
  return (
    <section aria-label="Municipal incident command dashboard" className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border-2 p-4"><p className="text-xs text-muted-foreground">Critical reports</p><p className="text-3xl font-bold text-red-600">{criticalReports.length}</p></div>
      <div className="rounded-2xl border-2 p-4"><p className="text-xs text-muted-foreground">Active road incidents</p><p className="text-3xl font-bold">{incidents.length}</p></div>
      <div className="rounded-2xl border-2 p-4"><p className="text-xs text-muted-foreground">Published alerts</p><p className="text-3xl font-bold">{alerts.filter((alert) => alert.status === "Published").length}</p></div>
      <div className="sm:col-span-3 rounded-2xl border-2 p-4">
        <p className="mb-2 font-bold">Incident lifecycle</p>
        <div className="flex flex-wrap gap-2">{INCIDENT_LIFECYCLE.map((stage) => <span key={stage} className="rounded-full border px-3 py-1 text-xs">{stage}</span>)}</div>
      </div>
    </section>
  );
}

export function toDispatchIncident(incident: RoadIncident): DispatchIncident {
  return { id: incident.id, wardCode: incident.tileId, lat: incident.lat ?? 0, lng: incident.lng ?? 0, status: "Received", auditTrail: [] };
}
