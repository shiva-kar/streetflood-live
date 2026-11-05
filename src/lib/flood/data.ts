import type { AppState, FloodAlert, FloodReport, RoadIncident, Shelter, TileBase } from "./types";

/** Flagship monitored corridor: Sion – Kurla – Chunabhatti, Mumbai. ~100m x 100m tiles. */
export const GRID = {
  rows: 24,
  cols: 24,
  south: 19.04,
  west: 72.86,
  dLat: 0.0009, // ≈ 100 m
  dLng: 0.00095, // ≈ 100 m at 19°N
};

export const MAP_CENTER: [number, number] = [12.9716, 77.5946]; // Bengaluru Central

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

export { COMPREHENSIVE_SHELTERS as SHELTERS } from "./sheltersDatabase";

export interface StaticRoadCorridor {
  id: string;
  name: string;
  roadName: string;
  coordinates: [number, number][]; // [lat, lng]
  typicalBottleneck: string;
}

export const BENGALURU_ROAD_CORRIDORS: StaticRoadCorridor[] = [
  // -------------------------------------------------------------------------
  // BENGALURU CIVIC FLOOD BOTTLENECK CORRIDORS (BBMP Monitored Zones)
  // -------------------------------------------------------------------------
  {
    id: "corridor_blr_ecospace",
    name: "Outer Ring Road (EcoSpace / Bellandur Underpass)",
    roadName: "Outer Ring Road (EcoSpace Service Road)",
    coordinates: [
      [12.9248, 77.6695],
      [12.9265, 77.6835],
      [12.9275, 77.6840],
      [12.9305, 77.6890],
      [12.9320, 77.6910],
    ],
    typicalBottleneck: "EcoSpace and Bellandur underpass stormwater canal overflow; traffic diversion to elevated flyover",
  },
  {
    id: "corridor_blr_silkboard",
    name: "Central Silk Board Junction & Underpass",
    roadName: "Hosur Road / Silk Board Interchange",
    coordinates: [
      [12.9150, 77.6220],
      [12.9172, 77.6228],
      [12.9195, 77.6235],
      [12.9220, 77.6180],
    ],
    typicalBottleneck: "Madiwala lake overflow gradient into Silk Board underpass; stalls two-wheelers and autos",
  },
  {
    id: "corridor_blr_koramangala_80ft",
    name: "Koramangala 80ft Road (4th Block / Sony World)",
    roadName: "80 Feet Road Koramangala",
    coordinates: [
      [12.9420, 77.6200],
      [12.9380, 77.6220],
      [12.9348, 77.6240],
      [12.9310, 77.6300],
    ],
    typicalBottleneck: "Primary stormwater drain (SWD) culvert overflow near Wipro Park and 4th Block market",
  },
  {
    id: "corridor_blr_panathur",
    name: "Panathur Railway Underpass (S-Bend Corridor)",
    roadName: "Panathur Main Road",
    coordinates: [
      [12.9355, 77.6970],
      [12.9370, 77.7030],
      [12.9390, 77.7090],
    ],
    typicalBottleneck: "Low-lying railway culvert with steep depression; prone to rapid 3-4ft inundation",
  },
  {
    id: "corridor_blr_sarjapur_iblur",
    name: "Sarjapur Road (Iblur Junction to Agara Lake)",
    roadName: "Sarjapur Main Road",
    coordinates: [
      [12.9310, 77.6190],
      [12.9270, 77.6350],
      [12.9248, 77.6530],
      [12.9248, 77.6695],
    ],
    typicalBottleneck: "Agara lake surplus weir backwater pooling along inbound IT corridor lanes",
  },
  {
    id: "corridor_blr_old_airport",
    name: "Old Airport Road (Domlur Flyover to HAL)",
    roadName: "Old Airport Road",
    coordinates: [
      [12.9620, 77.6380],
      [12.9590, 77.6480],
      [12.9570, 77.6600],
      [12.9550, 77.6760],
    ],
    typicalBottleneck: "Low-lying natural storm drainage dip near Manipal Hospital and Command Hospital gate",
  },
  {
    id: "corridor_blr_mekhri_circle",
    name: "Mekhri Circle Underpass (Bellary Road)",
    roadName: "Bellary Road / Airport Corridor",
    coordinates: [
      [12.9990, 77.5810],
      [13.0080, 77.5830],
      [13.0180, 77.5850],
    ],
    typicalBottleneck: "Mekhri Circle grade separator sump pit capacity during sudden downpours",
  },
];

export const AFFECTED_ROAD_CORRIDORS: StaticRoadCorridor[] = [
  // -------------------------------------------------------------------------
  // MUMBAI CIVIC FLOOD BOTTLENECK CORRIDORS (BMC Monitored Zones)
  // -------------------------------------------------------------------------
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
    label: "BBMP Disaster Helpline (Bengaluru)",
    number: "1533",
    note: "BBMP 24x7 Control Room",
  },
  {
    label: "City disaster control room",
    number: "1916",
    note: "BMC / Municipal Disaster Helpline",
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

export function seedState(now = Date.now()): AppState {
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
    // BENGALURU VERIFIED & LIVE HAZARD REPORTS
    {
      id: "blr_r1",
      tileId: "t_blr_silkboard",
      lat: 12.9175,
      lng: 77.6231,
      description: "Water accumulating near Silk Board junction bus shelter, autos avoiding curb lane.",
      severityUser: "Knees",
      createdAt: ago(now, 18),
      status: "Verified",
      reviewedAt: ago(now, 10),
    },
    {
      id: "blr_r2",
      tileId: "t_blr_madiwala",
      lat: 12.9180,
      lng: 77.6238,
      description: "Two-wheelers stalling near Madiwala lake overflow channel.",
      severityUser: "Knees",
      createdAt: ago(now, 25),
      status: "Unverified",
    },
    {
      id: "blr_r3",
      tileId: "t_blr_koramangala",
      lat: 12.9348,
      lng: 77.6240,
      description: "Footpath submerged near Koramangala 4th Block 80ft road shops.",
      severityUser: "Ankles",
      createdAt: ago(now, 40),
      status: "Unverified",
    },
    {
      id: "blr_r4",
      tileId: "t_blr_bellandur",
      lat: 12.9265,
      lng: 77.6835,
      description: "Outer Ring Road EcoSpace service road waterlogged, water rising past median.",
      severityUser: "WaistPlus",
      createdAt: ago(now, 12),
      status: "Verified",
      reviewedAt: ago(now, 6),
    },
    {
      id: "blr_r5",
      tileId: "t_blr_indiranagar",
      lat: 12.9710,
      lng: 77.6410,
      description: "Knee-deep water near 100ft Road Indiranagar 12th Main junction.",
      severityUser: "Knees",
      createdAt: ago(now, 30),
      status: "Unverified",
    },
  ];
  const incidents: RoadIncident[] = [
    {
      id: "i1",
      tileId: tileId(20, 16),
      status: "ClosedAllTraffic",
      description: "Subway closed due to heavy waterlogging. Traffic diverted via SCLR.",
      lat: GRID.south + (20 + 0.5) * GRID.dLat,
      lng: GRID.west + (16 + 0.5) * GRID.dLng,
      createdAt: ago(now, 8),
      updatedAt: ago(now, 8),
      createdBy: "Authority",
    },
    {
      id: "i2",
      tileId: tileId(2, 4),
      status: "ClosedSmallVehicles",
      description: "Closed to two-wheelers and autos near Sion Circle. Follow officer signals.",
      lat: GRID.south + (2 + 0.5) * GRID.dLat,
      lng: GRID.west + (4 + 0.5) * GRID.dLng,
      createdAt: ago(now, 9),
      updatedAt: ago(now, 9),
      createdBy: "Authority",
    },
    // BENGALURU LIVE INCIDENTS
    {
      id: "blr_i1",
      tileId: "t_blr_ecospace",
      status: "ClosedAllTraffic",
      description: "Outer Ring Road (EcoSpace underpass) submerged due to stormwater surge. Traffic diverted via Bellandur flyover.",
      lat: 12.9265,
      lng: 77.6835,
      createdAt: ago(now, 8),
      updatedAt: ago(now, 8),
      createdBy: "Authority",
    },
    {
      id: "blr_i2",
      tileId: "t_blr_silkboard_inc",
      status: "ClosedSmallVehicles",
      description: "Closed to two-wheelers and autos near Central Silk Board junction underpass. Follow traffic police signals.",
      lat: 12.9172,
      lng: 77.6228,
      createdAt: ago(now, 9),
      updatedAt: ago(now, 9),
      createdBy: "Authority",
    },
  ];
  const alerts: FloodAlert[] = [];
  return {
    version: 2,
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
