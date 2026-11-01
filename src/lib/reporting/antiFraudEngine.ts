export interface TrustSignals {
  deviceTenureDays: number;
  distanceFromGpsMeters: number;
  confirmations: number;
  roadClearVotes: number;
}

export function calculateTrustScore(signals: TrustSignals) {
  const tenure = Math.min(0.25, Math.max(0, signals.deviceTenureDays / 365) * 0.25);
  const proximity = signals.distanceFromGpsMeters <= 500 ? 0.3 : 0;
  const consensus = Math.max(-0.25, Math.min(0.45, signals.confirmations * 0.15 - signals.roadClearVotes * 0.25));
  return Number(Math.max(0, Math.min(1, 0.2 + tenure + proximity + consensus)).toFixed(3));
}

export function clusterReports<T extends { lat: number; lng: number; createdAt: string }>(
  reports: T[],
  radiusMeters = 50,
  windowMinutes = 15,
) {
  const clusters: T[][] = [];
  for (const report of reports) {
    const timestamp = Date.parse(report.createdAt);
    const cluster = clusters.find((items) => {
      const first = items[0]!;
      const distance = haversineMeters(first, report);
      return distance <= radiusMeters && Math.abs(timestamp - Date.parse(first.createdAt)) <= windowMinutes * 60_000;
    });
    if (cluster) cluster.push(report);
    else clusters.push([report]);
  }
  return clusters;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6_371_000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}
