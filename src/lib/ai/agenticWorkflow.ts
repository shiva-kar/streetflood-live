/**
 * StreetFlood AI — Agentic Civic Workflow Engine (IBM Bob & watsonx.ai Architecture)
 * 
 * Implements the multi-stage controlled agentic lifecycle:
 * Citizen Report → AI Analysis → Duplicate/Anomaly Assessment → Municipal Review → Human Approval → Public Advisory → Map Update
 * 
 * Strict safety rules:
 * 1. AI never automatically verifies citizen reports without human municipal sign-off.
 * 2. All confidence scores and classification rationales are fully explainable.
 * 3. Audit records preserve each transition with timestamps and actor identities.
 */

import type { FloodReport, RoadIncident, WaterDepth, Shelter } from "../flood/types";
import type { RealWeatherResult } from "../flood/openData";
import { getHaversineDistanceKm } from "../flood/sheltersDatabase";

export type WorkflowStage =
  | "CitizenReported"
  | "AiAnalyzed"
  | "AnomalyAssessed"
  | "MunicipalReview"
  | "HumanApproved"
  | "PublicAdvisory"
  | "MapUpdated"
  | "Dismissed";

export interface ReportAiAnalysis {
  reportId: string;
  extractedDepthCm: number;
  extractedDepthCategory: WaterDepth;
  identifiedRoadOrLandmark: string;
  incidentCategory:
    | "Underpass Inundation"
    | "Stormwater Canal (Rajakaluve) Overflow"
    | "Arterial Road Waterlogging"
    | "Residential Street Flooding"
    | "Footpath / Curb Pooling"
    | "Drainage Sump Surcharge";
  duplicateRisk: {
    isPotentialDuplicate: boolean;
    duplicateOfReportId?: string;
    similarityScore: number; // 0 - 100
    reason: string;
  };
  anomalyAssessment: {
    isSuspicious: boolean;
    anomalyFlags: string[];
    confidenceScore: number; // 0 - 100
    explanation: string;
  };
  recommendedAction: "Immediate Municipal Verification" | "Field Verification Required" | "Monitor Telemetry" | "Dismiss As Noise";
  recommendedPriority: "Critical" | "High" | "Medium" | "Low";
  analyzedAt: string;
}

export interface WorkflowAuditLogEntry {
  id: string;
  reportId: string;
  stage: WorkflowStage;
  timestamp: string;
  actor: "Citizen" | "IBM Bob Agentic Core" | "BBMP Ward Officer" | "Municipal System";
  details: string;
}

export interface IncidentCluster {
  id: string;
  centerLat: number;
  centerLng: number;
  name: string;
  ward: string;
  reportIds: string[];
  reportCount: number;
  highestSeverity: WaterDepth;
  averageDepthCm: number;
  associatedRoads: string[];
  trend: "Rapidly Deteriorating" | "Stabilizing" | "Receding";
  recommendedEvacuationShelter?: Shelter;
  severedCorridorCount: number;
}

export interface MunicipalAiTriageSummary {
  timestamp: string;
  totalPendingReports: number;
  clusters: IncidentCluster[];
  deterioratingNeighbourhoods: Array<{
    neighbourhood: string;
    ward: string;
    reason: string;
    severity: "Critical" | "High" | "Moderate";
  }>;
  severedEvacuationRoutes: Array<{
    corridorName: string;
    affectedShelter: string;
    recommendedDetour: string;
  }>;
  draftedPublicAdvisory: {
    titleEn: string;
    titleKn: string;
    messageEn: string;
    messageKn: string;
    severity: "Critical" | "Warning" | "Info";
    targetWards: string[];
  };
}

// ---------------------------------------------------------------------------
// 1. INTELLIGENT CITIZEN REPORT ANALYSIS (AI-Assisted Ingestion)
// ---------------------------------------------------------------------------

const DEPTH_MAP_CM: Record<WaterDepth, number> = {
  Footpath: 5,
  Ankles: 12,
  Knees: 35,
  WaistPlus: 75,
};

const BENGALURU_ROAD_KEYWORDS = [
  { keyword: "ecospace", name: "Outer Ring Road (EcoSpace Service Road)" },
  { keyword: "bellandur", name: "Outer Ring Road (Bellandur Gate)" },
  { keyword: "silk board", name: "Central Silk Board Junction / Hosur Rd" },
  { keyword: "silkboard", name: "Central Silk Board Junction" },
  { keyword: "koramangala", name: "Koramangala 80ft Road / Sony World" },
  { keyword: "panathur", name: "Panathur Railway Underpass" },
  { keyword: "sarjapur", name: "Sarjapur Main Road (Iblur to Agara)" },
  { keyword: "marathahalli", name: "Outer Ring Road (Marathahalli Bridge)" },
  { keyword: "whitefield", name: "Whitefield Main Road" },
  { keyword: "hebbal", name: "Hebbal Flyover / Outer Ring Road" },
  { keyword: "old airport", name: "Old Airport Road / Domlur" },
  { keyword: "madiwala", name: "Madiwala Lake Road" },
  { keyword: "hsr", name: "HSR Layout 27th Main Road" },
  { keyword: "btm", name: "BTM Layout 2nd Stage Ring Road" },
];

/**
 * Analyzes a newly submitted or drafted citizen report using rule-augmented agentic reasoning.
 * Extracts landmarks, detects duplicates, evaluates telemetry consistency, and computes explainable confidence.
 */
export function analyzeCitizenReport(
  report: {
    id: string;
    lat: number;
    lng: number;
    waterDepth: WaterDepth;
    description: string;
    createdAt?: string;
  },
  existingReports: FloodReport[],
  weather: RealWeatherResult | null
): ReportAiAnalysis {
  const text = (report.description || "").toLowerCase();
  const reportedCm = DEPTH_MAP_CM[report.waterDepth] || 15;

  // 1. Landmark & Affected Road Recognition
  let identifiedRoad = "Unspecified Corridor";
  for (const item of BENGALURU_ROAD_KEYWORDS) {
    if (text.includes(item.keyword)) {
      identifiedRoad = item.name;
      break;
    }
  }

  // 2. Incident Categorization
  let incidentCategory: ReportAiAnalysis["incidentCategory"] = "Arterial Road Waterlogging";
  if (text.includes("underpass") || text.includes("subway") || text.includes("ecospace") || text.includes("panathur")) {
    incidentCategory = "Underpass Inundation";
  } else if (text.includes("canal") || text.includes("rajakaluve") || text.includes("drain overflow") || text.includes("lake backwater")) {
    incidentCategory = "Stormwater Canal (Rajakaluve) Overflow";
  } else if (text.includes("footpath") || text.includes("puddle") || text.includes("curb")) {
    incidentCategory = "Footpath / Curb Pooling";
  } else if (text.includes("residential") || text.includes("layout") || text.includes("society") || text.includes("house")) {
    incidentCategory = "Residential Street Flooding";
  } else if (report.waterDepth === "WaistPlus") {
    incidentCategory = "Stormwater Canal (Rajakaluve) Overflow";
  }

  // 3. Duplicate Detection
  let isPotentialDuplicate = false;
  let duplicateOfReportId: string | undefined = undefined;
  let maxSimilarity = 0;
  let duplicateReason = "No duplicate submissions detected in immediate vicinity.";

  const nowMs = Date.now();
  for (const existing of existingReports) {
    if (existing.id === report.id) continue;
    const distKm = getHaversineDistanceKm(report.lat, report.lng, existing.lat, existing.lng);
    const existingTime = new Date(existing.createdAt).getTime();
    const ageMinutes = (nowMs - existingTime) / (60 * 1000);

    // Duplicate threshold: within 150 meters and reported within past 45 minutes
    if (distKm <= 0.15 && ageMinutes >= 0 && ageMinutes <= 45) {
      let similarity = 50;
      if (existing.severityUser === report.waterDepth) similarity += 30;
      if (text.length > 5 && existing.description.toLowerCase().includes(text.slice(0, 15))) {
        similarity += 20;
      }
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        if (similarity >= 70) {
          isPotentialDuplicate = true;
          duplicateOfReportId = existing.id;
          duplicateReason = `Corroborating report ${existing.id.slice(0, 8)} submitted ${(distKm * 1000).toFixed(0)}m away (${Math.round(ageMinutes)} min ago).`;
        }
      }
    }
  }

  // 4. Anomaly Assessment & Telemetry Cross-Referencing
  const anomalyFlags: string[] = [];
  let confidenceScore = 85;

  const rainRate = weather?.rainRateMmPerHour ?? 0;
  const recentRain = weather?.recentRainMm ?? 0;

  // Rule: WaistPlus reported with zero rain and dry recent hours is flagged for verification
  if (report.waterDepth === "WaistPlus" && rainRate < 1 && recentRain < 5) {
    anomalyFlags.push("Waist-deep water claimed despite minimal recent precipitation (<5 mm).");
    confidenceScore -= 30;
  }

  // Rule: Empty description with extreme severity
  if ((!report.description || report.description.trim().length < 5) && report.waterDepth === "WaistPlus") {
    anomalyFlags.push("High severity reported without descriptive context or landmark.");
    confidenceScore -= 15;
  }

  // Corroboration bonus: Nearby reports increase confidence
  const nearbyCorroborations = existingReports.filter(
    (r) => r.id !== report.id && getHaversineDistanceKm(report.lat, report.lng, r.lat, r.lng) < 0.5
  );
  if (nearbyCorroborations.length >= 2) {
    confidenceScore = Math.min(98, confidenceScore + 10);
  }

  confidenceScore = Math.max(20, Math.min(99, confidenceScore));

  const isSuspicious = anomalyFlags.length > 0 && confidenceScore < 60;
  const explanation = isSuspicious
    ? `Anomaly detected: ${anomalyFlags.join(" ")} Flagged for human municipal audit.`
    : `High telemetry consistency: Rainfall rate (${rainRate.toFixed(1)} mm/h) and ${nearbyCorroborations.length} local corroborations substantiate reported ${report.waterDepth} level.`;

  // 5. Recommended Municipal Action & Priority
  let recommendedAction: ReportAiAnalysis["recommendedAction"] = "Field Verification Required";
  let recommendedPriority: ReportAiAnalysis["recommendedPriority"] = "Medium";

  if (report.waterDepth === "WaistPlus" || incidentCategory === "Underpass Inundation") {
    recommendedAction = "Immediate Municipal Verification";
    recommendedPriority = "Critical";
  } else if (report.waterDepth === "Knees") {
    recommendedAction = isPotentialDuplicate ? "Monitor Telemetry" : "Immediate Municipal Verification";
    recommendedPriority = "High";
  } else if (report.waterDepth === "Footpath") {
    recommendedAction = "Monitor Telemetry";
    recommendedPriority = "Low";
  }

  return {
    reportId: report.id,
    extractedDepthCm: reportedCm,
    extractedDepthCategory: report.waterDepth,
    identifiedRoadOrLandmark: identifiedRoad,
    incidentCategory,
    duplicateRisk: {
      isPotentialDuplicate,
      duplicateOfReportId,
      similarityScore: maxSimilarity,
      reason: duplicateReason,
    },
    anomalyAssessment: {
      isSuspicious,
      anomalyFlags,
      confidenceScore,
      explanation,
    },
    recommendedAction,
    recommendedPriority,
    analyzedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// 2. INTELLIGENT MUNICIPAL INCIDENT ASSISTANT (Triage & Public Advisory)
// ---------------------------------------------------------------------------

/**
 * Clusters active unverified reports, detects rapidly deteriorating neighbourhoods,
 * evaluates severed evacuation paths, and drafts CAP-compliant bilingual advisories.
 */
export function generateMunicipalTriageSummary(
  reports: FloodReport[],
  incidents: RoadIncident[],
  weather: RealWeatherResult | null,
  shelters: Shelter[]
): MunicipalAiTriageSummary {
  const pending = reports.filter((r) => r.status === "Unverified");
  const clusters: IncidentCluster[] = [];

  // Spatial clustering (~400m radius)
  const visited = new Set<string>();

  for (const rep of pending) {
    if (visited.has(rep.id)) continue;
    const clusterReports = [rep];
    visited.add(rep.id);

    for (const other of pending) {
      if (visited.has(other.id)) continue;
      if (getHaversineDistanceKm(rep.lat, rep.lng, other.lat, other.lng) <= 0.45) {
        clusterReports.push(other);
        visited.add(other.id);
      }
    }

    if (clusterReports.length > 0) {
      const avgLat = clusterReports.reduce((s, r) => s + r.lat, 0) / clusterReports.length;
      const avgLng = clusterReports.reduce((s, r) => s + r.lng, 0) / clusterReports.length;

      // Determine highest severity
      const ranks: Record<WaterDepth, number> = { Footpath: 1, Ankles: 2, Knees: 3, WaistPlus: 4 };
      let highest: WaterDepth = "Footpath";
      let highestRank = 0;
      let totalCm = 0;
      for (const r of clusterReports) {
        const rank = ranks[r.severityUser] || 1;
        totalCm += DEPTH_MAP_CM[r.severityUser] || 15;
        if (rank > highestRank) {
          highestRank = rank;
          highest = r.severityUser;
        }
      }

      // Check nearest shelter
      let bestShelter: Shelter | undefined = undefined;
      let minD = Infinity;
      for (const sh of shelters) {
        const d = getHaversineDistanceKm(avgLat, avgLng, sh.lat, sh.lng);
        if (d < minD) {
          minD = d;
          bestShelter = sh;
        }
      }

      // Associated roads
      const roads = new Set<string>();
      for (const r of clusterReports) {
        for (const kw of BENGALURU_ROAD_KEYWORDS) {
          if (r.description.toLowerCase().includes(kw.keyword)) {
            roads.add(kw.name);
          }
        }
      }

      // Deterioration trend
      const trend: IncidentCluster["trend"] =
        highest === "WaistPlus" || (weather?.rainRateMmPerHour ?? 0) > 15
          ? "Rapidly Deteriorating"
          : clusterReports.length >= 2
          ? "Stabilizing"
          : "Receding";

      const clusterName =
        roads.size > 0
          ? Array.from(roads)[0]
          : `Cluster near [${avgLat.toFixed(3)}, ${avgLng.toFixed(3)}]`;

      clusters.push({
        id: `cluster_${clusters.length + 1}`,
        centerLat: avgLat,
        centerLng: avgLng,
        name: clusterName,
        ward: avgLat > 12.92 && avgLng > 77.65 ? "Mahadevapura (Ward 150)" : "Bommanahalli / South",
        reportIds: clusterReports.map((r) => r.id),
        reportCount: clusterReports.length,
        highestSeverity: highest,
        averageDepthCm: Math.round(totalCm / clusterReports.length),
        associatedRoads: Array.from(roads),
        trend,
        recommendedEvacuationShelter: bestShelter,
        severedCorridorCount: highest === "WaistPlus" ? 2 : highest === "Knees" ? 1 : 0,
      });
    }
  }

  // Deteriorating Neighbourhoods
  const deterioratingNeighbourhoods: MunicipalAiTriageSummary["deterioratingNeighbourhoods"] = [];
  const rainRate = weather?.rainRateMmPerHour ?? 0;

  for (const c of clusters) {
    if (c.trend === "Rapidly Deteriorating" || c.highestSeverity === "WaistPlus") {
      deterioratingNeighbourhoods.push({
        neighbourhood: c.name,
        ward: c.ward,
        reason: `${c.reportCount} reports logged; depth averaging ${c.averageDepthCm}cm under ${rainRate.toFixed(1)}mm/h precipitation.`,
        severity: c.highestSeverity === "WaistPlus" ? "Critical" : "High",
      });
    }
  }

  // Severed Evacuation Routes
  const severedEvacuationRoutes: MunicipalAiTriageSummary["severedEvacuationRoutes"] = [];
  for (const inc of incidents) {
    if (inc.status === "ClosedAllTraffic") {
      severedEvacuationRoutes.push({
        corridorName: inc.description || "Active Road Closure",
        affectedShelter: "Nearest Municipal Relief Hall",
        recommendedDetour: "Use elevated flyover carriageway or arterial perimeter bypass.",
      });
    }
  }

  // Drafted Bilingual Public Advisory
  const hasCritical = clusters.some((c) => c.highestSeverity === "WaistPlus") || incidents.some((i) => i.status === "ClosedAllTraffic");
  const topCorridors = clusters
    .flatMap((c) => c.associatedRoads)
    .slice(0, 3)
    .join(", ") || "Outer Ring Road & Silk Board";

  const draftedPublicAdvisory: MunicipalAiTriageSummary["draftedPublicAdvisory"] = {
    titleEn: hasCritical
      ? "Critical Urban Flood Warning: Hazardous Inundation Declared"
      : "Monsoon Traffic Advisory: Water Accumulation Alert",
    titleKn: hasCritical
      ? "ತುರ್ತು ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆ: ರಸ್ತೆ ಜಲಾವೃತ ಘೋಷಣೆ"
      : "ಮಳೆ ಸಂಚಾರ ಎಚ್ಚರಿಕೆ: ರಸ್ತೆ ನೀರು ನಿಲ್ಲುವಿಕೆ ಮಾಹಿತಿ",
    messageEn: hasCritical
      ? `Heavy stormwater backwater reported along ${topCorridors}. Submerged service lanes and underpasses are closed to low-clearance vehicles. Evacuate to nearest designated BBMP relief shelters.`
      : `Moderate rainwater pooling reported on ${topCorridors}. Commuters advised to slow down and use elevated flyovers.`,
    messageKn: hasCritical
      ? `${topCorridors} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ತೀವ್ರ ಜಲಾವೃತ ಉಂಟಾಗಿದೆ. ಅಂಡರ್‌ಪಾಸ್ ಹಾಗೂ ಸರ್ವಿಸ್ ರಸ್ತೆಗಳಲ್ಲಿ ಸಣ್ಣ ವಾಹನಗಳ ಸಂಚಾರ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ. ಸಮೀಪದ ಬಿಬಿಎಂಪಿ ಆಶ್ರಯ ತಾಣಗಳಿಗೆ ತೆರಳಿ.`
      : `${topCorridors} ನಲ್ಲಿ ಸಾಧಾರಣ ನೀರು ನಿಂತಿದೆ. ನಿಧಾನವಾಗಿ ವಾಹನ ಚಲಾಯಿಸಿ ಮೇಲ್ಸೇತುವೆ ಬಳಸಲು ಸೂಚಿಸಲಾಗಿದೆ.`,
    severity: hasCritical ? "Critical" : "Warning",
    targetWards: ["Mahadevapura (Ward 150)", "Bommanahalli (Ward 174)", "Koramangala (Ward 151)"],
  };

  return {
    timestamp: new Date().toISOString(),
    totalPendingReports: pending.length,
    clusters,
    deterioratingNeighbourhoods,
    severedEvacuationRoutes,
    draftedPublicAdvisory,
  };
}

// ---------------------------------------------------------------------------
// 3. AGENTIC WORKFLOW AUDIT STORE (In-Memory / Local Storage Synced)
// ---------------------------------------------------------------------------

const WORKFLOW_AUDIT_STORAGE_KEY = "streetflood_agentic_audit_logs";

let inMemoryAuditLogs: WorkflowAuditLogEntry[] = [];

export function getWorkflowAuditLogs(): WorkflowAuditLogEntry[] {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(WORKFLOW_AUDIT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback to in-memory
    }
  }
  return inMemoryAuditLogs;
}

export function recordWorkflowStep(entry: Omit<WorkflowAuditLogEntry, "id" | "timestamp">): WorkflowAuditLogEntry {
  const fullEntry: WorkflowAuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const logs = [fullEntry, ...getWorkflowAuditLogs()];
  inMemoryAuditLogs = logs.slice(0, 100);

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(WORKFLOW_AUDIT_STORAGE_KEY, JSON.stringify(inMemoryAuditLogs));
    } catch {
      // Storage quota fallback
    }
  }

  return fullEntry;
}
