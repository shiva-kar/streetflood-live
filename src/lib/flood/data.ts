import type { AppState, FloodAlert, FloodReport, RoadIncident, Shelter, TileBase } from "./types";

/** Demo area: Sion – Kurla – Chunabhatti, Mumbai. ~100m x 100m tiles. */
export const GRID = {
  rows: 24,
  cols: 24,
  south: 19.04,
  west: 72.86,
  dLat: 0.0009, // ≈ 100 m
  dLng: 0.00095, // ≈ 100 m at 19°N
};

export const MAP_CENTER: [number, number] = [
  GRID.south + (GRID.rows * GRID.dLat) / 2,
  GRID.west + (GRID.cols * GRID.dLng) / 2,
];

export const ZONES = [
  { key: "sion", label: "Sion", rows: [0, 11], cols: [0, 11] },
  { key: "chunabhatti", label: "Chunabhatti", rows: [0, 11], cols: [12, 23] },
  { key: "kurla-sw", label: "Kurla (Mithi edge)", rows: [12, 23], cols: [0, 11] },
  { key: "kurla-w", label: "Kurla West", rows: [12, 23], cols: [12, 23] },
] as const;

export function zoneFor(row: number, col: number) {
  return ZONES.find(
    (z) => row >= z.rows[0] && row <= z.rows[1] && col >= z.cols[0] && col <= z.cols[1],
  )!;
}

/** Deterministic hash → [0,1). Avoids Math.random so seeds are stable. */
export function hash01(a: number, b: number, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10000) / 10000;
}

const HOTSPOT_BOXES = [
  { rows: [1, 4], cols: [2, 6], name: "Sion Circle low-lying stretch" },
  { rows: [5, 8], cols: [15, 19], name: "Chunabhatti nullah belt" },
  { rows: [13, 20], cols: [0, 3], name: "Mithi river edge" },
  { rows: [18, 22], cols: [14, 19], name: "Kurla station / LBS Marg" },
];

export function tileId(row: number, col: number) {
  return `t_${row}_${col}`;
}

export function buildTiles(): TileBase[] {
  const out: TileBase[] = [];
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const hb = HOTSPOT_BOXES.find(
        (b) => r >= b.rows[0] && r <= b.rows[1] && c >= b.cols[0] && c <= b.cols[1],
      );
      const z = zoneFor(r, c);
      const noise = hash01(r, c, 7);
      out.push({
        id: tileId(r, c),
        row: r,
        col: c,
        centerLat: GRID.south + (r + 0.5) * GRID.dLat,
        centerLng: GRID.west + (c + 0.5) * GRID.dLng,
        ward: z.key,
        locality: hb ? hb.name : `${z.label} – block ${r + 1}${String.fromCharCode(65 + (c % 26))}`,
        isHotspot: !!hb,
        drainageScore: Math.round(hb ? 15 + noise * 25 : 40 + noise * 55),
        rainFactor: 0.8 + hash01(r, c, 3) * 0.4,
      });
    }
  }
  return out;
}

export const SHELTERS: Shelter[] = [
  {
    id: "sh1",
    name: "Demo Shelter A – Municipal School",
    address: "Sion East / SIES College Area (simulated)",
    lat: 19.0455,
    lng: 72.8655,
    kind: "School",
    capacityStatus: "Space available",
    provenance: "Simulated Demo",
    accessibilityNote: "Ground-floor ramp access; emergency medical desk (simulated)",
  },
  {
    id: "sh2",
    name: "Demo Shelter B – Community Hall",
    address: "Chunabhatti East (simulated)",
    lat: 19.0478,
    lng: 72.879,
    kind: "Community Hall",
    capacityStatus: "Filling up",
    provenance: "Simulated Demo",
    accessibilityNote: "Elevated community hall; food and dry relief point (simulated)",
  },
  {
    id: "sh3",
    name: "Demo Shelter C – Ward Office Annexe",
    address: "Kurla West, off LBS Marg (simulated)",
    lat: 19.0585,
    lng: 72.8745,
    kind: "Municipal Building",
    capacityStatus: "Space available",
    provenance: "Simulated Demo",
    accessibilityNote: "Municipal administration building; high elevation (simulated)",
  },
  {
    id: "sh4",
    name: "Demo Shelter D – Secondary School",
    address: "Kurla West / CST Road corridor (simulated)",
    lat: 19.0565,
    lng: 72.8715,
    kind: "School",
    capacityStatus: "Near capacity",
    provenance: "Simulated Demo",
    accessibilityNote: "Multi-story education complex; emergency bedding (simulated)",
  },
  {
    id: "sh5",
    name: "Demo Shelter E – Community Centre",
    address: "Sion–Kurla link road (simulated)",
    lat: 19.0515,
    lng: 72.8712,
    kind: "Community Hall",
    capacityStatus: "Space available",
    provenance: "Simulated Demo",
    accessibilityNote: "Direct access from elevated link road corridor (simulated)",
  },
];

export interface StaticRoadCorridor {
  id: string;
  name: string;
  roadName: string;
  coordinates: [number, number][]; // [lat, lng]
  typicalBottleneck: string;
}

export const AFFECTED_ROAD_CORRIDORS: StaticRoadCorridor[] = [
  {
    id: "corridor_lbs_subway",
    name: "Kurla Station / LBS Marg Subway",
    roadName: "Lal Bahadur Shastri (LBS) Marg",
    coordinates: [
      [19.0615, 72.8735],
      [19.0598, 72.8752],
      [19.0588, 72.8765],
      [19.0575, 72.875],
      [19.055, 72.8732],
      [19.053, 72.871],
    ],
    typicalBottleneck: "Kurla Station Railway Underpass (subway) prone to rapid 3-4ft waterlogging",
  },
  {
    id: "corridor_sion_circle",
    name: "Sion Circle Roundabout & Link",
    roadName: "Sion Circle / Sion–Bandra Link Road",
    coordinates: [
      [19.0425, 72.8615],
      [19.0435, 72.8625],
      [19.045, 72.864],
      [19.0465, 72.866],
      [19.048, 72.8675],
    ],
    typicalBottleneck: "Sion Circle low-lying depression; stalls two-wheelers and autos",
  },
  {
    id: "corridor_cst_road",
    name: "CST Road Arterial Connection",
    roadName: "Chhatrapati Shivaji Terminus (CST) Road",
    coordinates: [
      [19.0525, 72.8685],
      [19.0545, 72.871],
      [19.0565, 72.8735],
      [19.058, 72.8755],
    ],
    typicalBottleneck: "Primary connecting link between BKC, Chunabhatti and Kurla West",
  },
  {
    id: "corridor_swadeshi_mills",
    name: "Swadeshi Mills / Chunabhatti Nullah",
    roadName: "Swadeshi Mills Road",
    coordinates: [
      [19.0478, 72.8735],
      [19.0485, 72.8765],
      [19.0495, 72.8795],
      [19.0515, 72.881],
    ],
    typicalBottleneck: "Chunabhatti nullah overflow stretch along Central Railway tracks",
  },
  {
    id: "corridor_mithi_perimeter",
    name: "Mithi River Low-Lying Edge",
    roadName: "Sant Rohidas Marg (Mithi River Edge)",
    coordinates: [
      [19.0435, 72.8625],
      [19.047, 72.8632],
      [19.0505, 72.8638],
      [19.054, 72.8642],
      [19.0565, 72.8648],
    ],
    typicalBottleneck: "Low-lying river wall stretch; high-tide river backwater accumulation",
  },
];

export const EMERGENCY_CONTACTS = [
  { label: "National Emergency", number: "112", note: "All emergencies" },
  { label: "Police", number: "100", note: "" },
  { label: "Fire & Rescue", number: "101", note: "" },
  { label: "Ambulance", number: "108", note: "Emergency medical" },
  { label: "Ambulance (maternal/child)", number: "102", note: "" },
  {
    label: "City disaster control room",
    number: "1916",
    note: "Demo listing – confirm with your municipality",
  },
];

export const CHECKLISTS = [
  {
    key: "household",
    title: "Household",
    items: [
      "Move valuables and documents to higher shelves",
      "Keep a small emergency kit (torch, medicines, power bank, dry snacks)",
      "Turn off power to low-lying plug points if water enters rooms",
      "Store drinking water in clean, covered containers",
    ],
  },
  {
    key: "vehicles",
    title: "Vehicles",
    items: [
      "Move cars and bikes to higher ground or multi-level parking",
      "Do not attempt to drive through water above wheel level",
      "Keep the fuel tank half full and phone charger in the vehicle",
    ],
  },
  {
    key: "vulnerable",
    title: "Vulnerable family members",
    items: [
      "Identify who needs help (elderly, disabled, infants, pregnant women)",
      "Pre-arrange transport or neighbour/relative support",
      "Keep medical documents and medicines in a waterproof bag",
    ],
  },
];

const ago = (now: number, min: number) => new Date(now - min * 60000).toISOString();

export function seedState(now: number): AppState {
  const reports: FloodReport[] = [
    {
      id: "r1",
      tileId: tileId(2, 4),
      lat: 19.0422,
      lng: 72.8642,
      description: "Water collecting near the bus stop, autos avoiding the left lane.",
      severityUser: "Knees",
      createdAt: ago(now, 18),
      status: "Verified",
      reviewedAt: ago(now, 10),
      photoUrl: `${import.meta.env.BASE_URL}images/demo-flood-1.jpg`,
    },
    {
      id: "r2",
      tileId: tileId(2, 4),
      lat: 19.0424,
      lng: 72.8645,
      description: "Two-wheelers stalling here.",
      severityUser: "Knees",
      createdAt: ago(now, 25),
      status: "Unverified",
    },
    {
      id: "r3",
      tileId: tileId(3, 5),
      lat: 19.0432,
      lng: 72.8653,
      description: "Footpath submerged outside shops.",
      severityUser: "Ankles",
      createdAt: ago(now, 40),
      status: "Unverified",
    },
    {
      id: "r4",
      tileId: tileId(20, 16),
      lat: 19.0584,
      lng: 72.8756,
      description: "Subway approach flooded, water rising quickly.",
      severityUser: "WaistPlus",
      createdAt: ago(now, 12),
      status: "Verified",
      reviewedAt: ago(now, 6),
      photoUrl: `${import.meta.env.BASE_URL}images/demo-flood-2.jpg`,
    },
    {
      id: "r5",
      tileId: tileId(20, 16),
      lat: 19.0585,
      lng: 72.8757,
      description: "Cars stuck under the bridge.",
      severityUser: "WaistPlus",
      createdAt: ago(now, 15),
      status: "Unverified",
    },
    {
      id: "r6",
      tileId: tileId(19, 17),
      lat: 19.0576,
      lng: 72.8766,
      description: "Knee-deep water near station road.",
      severityUser: "Knees",
      createdAt: ago(now, 30),
      status: "Unverified",
    },
    {
      id: "r7",
      tileId: tileId(6, 17),
      lat: 19.0458,
      lng: 72.8766,
      description: "Nullah overflowing onto lane.",
      severityUser: "Knees",
      createdAt: ago(now, 22),
      status: "Unverified",
    },
    {
      id: "r8",
      tileId: tileId(15, 1),
      lat: 19.0538,
      lng: 72.8614,
      description: "Water entering ground-floor homes near the river wall.",
      severityUser: "Knees",
      createdAt: ago(now, 35),
      status: "Verified",
      reviewedAt: ago(now, 20),
    },
    {
      id: "r9",
      tileId: tileId(10, 12),
      lat: 19.0495,
      lng: 72.8719,
      description: "Some puddles, traffic moving.",
      severityUser: "Footpath",
      createdAt: ago(now, 50),
      status: "Unverified",
    },
    {
      id: "r10",
      tileId: tileId(12, 8),
      lat: 19.0512,
      lng: 72.8681,
      description: "Garbage blocking drain, minor pooling.",
      severityUser: "Ankles",
      createdAt: ago(now, 45),
      status: "Unverified",
    },
  ];
  const incidents: RoadIncident[] = [
    {
      id: "i1",
      tileId: tileId(20, 16),
      status: "ClosedAllTraffic",
      description: "Subway closed due to waterlogging (demo incident).",
      createdAt: ago(now, 8),
      updatedAt: ago(now, 8),
      createdBy: "Authority",
    },
    {
      id: "i2",
      tileId: tileId(2, 4),
      status: "ClosedSmallVehicles",
      description: "Closed to two-wheelers and autos near the circle (demo).",
      createdAt: ago(now, 9),
      updatedAt: ago(now, 9),
      createdBy: "Authority",
    },
  ];
  const alerts: FloodAlert[] = [
    {
      id: "a1",
      title: "Subway closed – Kurla West",
      message:
        "The subway near Kurla station is closed to all traffic due to waterlogging. Use the alternate link road. (Demo alert)",
      severity: "Critical",
      type: "Municipal",
      status: "Published",
      tileIds: [tileId(20, 16), tileId(19, 16), tileId(20, 17)],
      wardLabel: "Kurla West",
      createdAt: ago(now, 8),
      publishedAt: ago(now, 8),
    },
    {
      id: "a2",
      title: "Waterlogging near Sion Circle",
      message: "Knee-deep water reported. Two-wheelers advised to avoid the stretch. (Demo alert)",
      severity: "Warning",
      type: "Municipal",
      status: "Published",
      tileIds: [tileId(2, 4), tileId(3, 4), tileId(3, 5)],
      wardLabel: "Sion",
      createdAt: ago(now, 9),
      publishedAt: ago(now, 9),
    },
  ];
  return {
    version: 1,
    reports,
    incidents,
    alerts,
    sim: {
      recentRainfall: 28,
      forecastRainfall: 42,
      drainageOffset: 0,
      useHotspots: true,
      tick: 0,
      lastSensorRefresh: ago(now, 4),
    },
    archivedPredictiveWards: [],
    checklist: {},
    homeWard: "sion",
  };
}
