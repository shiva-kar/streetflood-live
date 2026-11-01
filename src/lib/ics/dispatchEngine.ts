export const INCIDENT_LIFECYCLE = [
  "Received",
  "Triage / Verified",
  "Field Unit Dispatched",
  "Pump / Sandbag Active",
  "Water Receded",
  "Structural Clearance",
  "Closed",
] as const;

export type IncidentLifecycleStatus = (typeof INCIDENT_LIFECYCLE)[number];

export interface IncidentAuditEntry {
  status: IncidentLifecycleStatus;
  officerId: string;
  timestamp: string;
  resolutionLog?: string;
}

export interface DispatchIncident {
  id: string;
  wardCode: string;
  lat: number;
  lng: number;
  status: IncidentLifecycleStatus;
  auditTrail: IncidentAuditEntry[];
}

export function advanceIncident(
  incident: DispatchIncident,
  nextStatus: IncidentLifecycleStatus,
  officerId: string,
  resolutionLog?: string,
): DispatchIncident {
  const currentIndex = INCIDENT_LIFECYCLE.indexOf(incident.status);
  const nextIndex = INCIDENT_LIFECYCLE.indexOf(nextStatus);
  if (nextIndex < currentIndex) throw new Error("Incident lifecycle cannot move backwards.");
  if (nextIndex > currentIndex + 1) throw new Error("Incident lifecycle must advance one stage at a time.");
  return {
    ...incident,
    status: nextStatus,
    auditTrail: [...incident.auditTrail, {
      status: nextStatus,
      officerId,
      timestamp: new Date().toISOString(),
      ...(resolutionLog ? { resolutionLog } : {}),
    }],
  };
}

export interface DispatchResource {
  id: string;
  type: "pump" | "sandbags" | "boat" | "jcb" | "ambulance";
  lat: number;
  lng: number;
  available: boolean;
  capacity?: number;
}

function haversineMeters(a: Pick<DispatchResource, "lat" | "lng">, b: Pick<DispatchIncident, "lat" | "lng">) {
  const r = 6_371_000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

export function rankDispatchResources(resources: DispatchResource[], incident: DispatchIncident) {
  return resources
    .filter((resource) => resource.available)
    .map((resource) => ({ resource, distanceMeters: haversineMeters(resource, incident) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
