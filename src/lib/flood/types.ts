export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";
export type RoadRiskLevel = "Low" | "Moderate" | "High" | "Critical" | "Closed" | "Unassessed";
export type PredictedRiskLevel = "Low" | "Moderate";
export type WaterDepth = "Footpath" | "Ankles" | "Knees" | "WaistPlus";
export type ReportStatus = "Unverified" | "Verified" | "Dismissed";
export type IncidentStatus = "PartiallyFlooded" | "ClosedSmallVehicles" | "ClosedAllTraffic";
export type AlertSeverity = "Info" | "Warning" | "Critical";
export type AlertType = "Municipal" | "Predictive" | "PredictiveForecast";
export type AlertStatus = "Draft" | "Published" | "Archived";

/** Static per-tile attributes (hydrological baseline). */
export interface TileBase {
  id: string;
  row: number;
  col: number;
  centerLat: number;
  centerLng: number;
  ward: string;
  locality: string;
  isHotspot: boolean;
  /** 0–100, low = poor drainage */
  drainageScore: number;
  /** local multiplier on city rainfall (microclimate and catchment response) */
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
  waterDepth?: WaterDepth | undefined;
  depthMeters?: number | undefined;
  confirmVotes?: number | undefined;
  clearedVotes?: number | undefined;
  photoUrl?: string | undefined;
  createdAt: string;
  status: ReportStatus;
  reviewedAt?: string | undefined;
}

export interface RoadIncident {
  id: string;
  tileId: string;
  status: IncidentStatus;
  description: string;
  notes?: string | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
  photoUrl?: string | undefined;
  createdAt: string;
  updatedAt: string;
  createdBy: "Citizen" | "Authority";
}

export interface FloodAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  type: AlertType;
  status: AlertStatus;
  tileIds: string[];
  wardLabel?: string | undefined;
  createdAt: string;
  publishedAt?: string | undefined;
}

export interface Shelter {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind: "School" | "Community Hall" | "Municipal Building" | "Stadium" | "Relief Center" | string;
  capacityStatus: "Space available" | "Filling up" | "Near capacity" | string;
  provenance?: "Official Verified" | "Community Reported" | "OpenStreetMap Public Data";
  accessibilityNote?: string;
  ward?: string;
  contactPhone?: string;
  drinkingWater?: boolean;
  medicalAid?: boolean;
  wheelchairAccessible?: boolean;
  petFriendly?: boolean;
}

export type EvacuationMode = "pedestrian" | "twowheeler" | "car" | "heavyRescue";

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
  highContrast?: boolean;
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
  source: "Municipal Verified" | "Field Sensor" | "Citizen Report" | "Hydrological Baseline";
  precautions: string[];
}

export interface Simulation {
  /** City-level observed rainfall, mm in last hour */
  recentRainfall: number;
  /** City-level precipitation forecast, mm next 3 hours */
  forecastRainfall: number;
  /** Global offset applied to all drainage scores (-40..+40) */
  drainageOffset: number;
  /** Whether hotspot index is counted in prediction */
  useHotspots: boolean;
  /** Scenario tick for telemetry oscillation */
  tick: number;
  lastSensorRefresh: string;
}

export interface AppState {
  version: 1 | 2;
  reports: FloodReport[];
  incidents: RoadIncident[];
  alerts: FloodAlert[];
  sim: Simulation;
  /** ward keys whose auto predictive warning was archived by authority */
  archivedPredictiveWards: string[];
  checklist: Record<string, boolean>;
  homeWard: string;
}
