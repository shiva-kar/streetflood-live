export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";
export type RoadRiskLevel = "Low" | "Moderate" | "High" | "Critical" | "Closed" | "Unassessed";
export type PredictedRiskLevel = "Low" | "Moderate";
export type WaterDepth = "Footpath" | "Ankles" | "Knees" | "WaistPlus";
export type ReportStatus = "Unverified" | "Verified" | "Dismissed";
export type IncidentStatus = "PartiallyFlooded" | "ClosedSmallVehicles" | "ClosedAllTraffic";
export type AlertSeverity = "Info" | "Warning" | "Critical";
export type AlertType = "Municipal" | "PredictiveSimulated";
export type AlertStatus = "Draft" | "Published" | "Archived";

/** Static per-tile attributes (seeded, simulated). */
export interface TileBase {
  id: string;
  row: number;
  col: number;
  centerLat: number;
  centerLng: number;
  ward: string;
  locality: string;
  isHotspot: boolean;
  /** 0–100, low = poor drainage (simulated) */
  drainageScore: number;
  /** local multiplier on city rainfall (simulated microclimate) */
  rainFactor: number;
}

/** Tile with derived, live values. */
export interface Tile extends TileBase {
  currentSeverityScore: number;
  currentRiskLevel: RiskLevel;
  lastUpdated: string;
  sensorLevel: number;
  recentRainfallMmLastHour: number;
  forecastRainfallNext3Hours: number;
  predictedRisk: PredictedRiskLevel;
  predictionReasons: string[];
  severityBreakdown: string[];
  closure?: IncidentStatus;
  verifiedReports: number;
  unverifiedReports: number;
}

export interface FloodReport {
  id: string;
  tileId: string;
  lat: number;
  lng: number;
  description: string;
  severityUser: WaterDepth;
  photoUrl?: string;
  createdAt: string;
  status: ReportStatus;
  reviewedAt?: string;
}

export interface RoadIncident {
  id: string;
  tileId: string;
  status: IncidentStatus;
  description: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: "Authority";
}

export interface FloodAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  type: AlertType;
  status: AlertStatus;
  tileIds: string[];
  wardLabel?: string;
  createdAt: string;
  publishedAt?: string;
}

export interface Shelter {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind: "School" | "Community Hall" | "Municipal Building";
  capacityStatus: "Space available" | "Filling up" | "Near capacity";
  provenance?: "Official Verified" | "Community Reported" | "Simulated Demo";
  accessibilityNote?: string;
}

export interface RoadRouteStep {
  instruction: string;
  streetName: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RoadRouteResult {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  durationMinutes: number;
  steps: RoadRouteStep[];
  safetyScore: number; // 0 - 100
  safetyStatus: "Safe" | "Caution" | "HighRisk" | "Impassable";
  safetyMessage: string;
  blockedByClosure?: {
    incidentId: string;
    description: string;
    location: string;
  };
  counts: Record<RiskLevel, number>;
  dangerWarnings: string[];
  isAlternative?: boolean;
  provider: "OSRM" | "CorridorFallback" | "Unavailable";
  summaryText?: string;
}

export interface ShelterCandidate {
  shelter: Shelter;
  route: RoadRouteResult | null;
  isRecommended: boolean;
  rejectionReason?: string;
  roadDistanceKm?: number;
  roadDurationMinutes?: number;
}

export interface MapLayerOptions {
  showTechnicalGrid: boolean;
  showAffectedRoads: boolean;
  showClosures: boolean;
  showShelters: boolean;
  showEvacuationRoute: boolean;
  showReports: boolean;
}

export interface RoadSegment {
  id: string;
  name: string;
  coordinates: [number, number][]; // [lat, lng][]
  riskLevel: RoadRiskLevel;
  waterDepth?: WaterDepth;
  statusDescription?: string;
  closure?: IncidentStatus;
  lastUpdated?: string;
  source: "Municipal Verified" | "Field Sensor" | "Citizen Report" | "Simulated Baseline";
  precautions: string[];
}

export interface Simulation {
  /** City-level simulated rainfall, mm in last hour */
  recentRainfall: number;
  /** City-level simulated forecast, mm next 3 hours */
  forecastRainfall: number;
  /** Global offset applied to all drainage scores (-40..+40) */
  drainageOffset: number;
  /** Whether hotspot index is counted in prediction */
  useHotspots: boolean;
  /** Incremented by "refresh simulated readings" */
  tick: number;
  lastSensorRefresh: string;
}

export interface AppState {
  version: 1;
  reports: FloodReport[];
  incidents: RoadIncident[];
  alerts: FloodAlert[];
  sim: Simulation;
  /** ward keys whose auto predictive warning was archived by authority */
  archivedPredictiveWards: string[];
  checklist: Record<string, boolean>;
  homeWard: string;
}
