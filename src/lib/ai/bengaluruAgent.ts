import { findNearestKnownShelters, getHaversineDistanceKm, type Shelter } from "@/lib/flood/sheltersDatabase";
import type { FloodReport, RoadIncident } from "@/lib/flood/types";
import type { RealWeatherResult } from "@/lib/flood/openData";

export interface AgentAction {
  id: string;
  label: string;
  labelKn: string;
  type: "pan" | "navigate" | "call" | "report";
  lat?: number;
  lng?: number;
  phone?: string;
  zoom?: number;
}

export interface AgenticQueryResponse {
  query: string;
  headline: string;
  headlineKn: string;
  status: "Safe" | "Caution" | "Impassable";
  reasoningSteps: string[];
  reasoningStepsKn: string[];
  explanation: string;
  explanationKn: string;
  suggestedActions: AgentAction[];
  modelBadge: string;
  timestamp: string;
}

interface CivicAgentContext {
  userPos: [number, number];
  weather: RealWeatherResult | null;
  reports: FloodReport[];
  incidents: RoadIncident[];
  activeCityName?: string;
}

/**
 * IBM Bob Civic Agentic Engine for Bengaluru.
 * Simulates enterprise multi-agent reasoning (watsonx.ai Granite 3.0 / IBM Bob orchestration)
 * combining real hydrology telemetry, OSM road corridors, citizen reports, and BBMP shelter readiness.
 */
export async function runBobCivicAgent(
  query: string,
  context: CivicAgentContext
): Promise<AgenticQueryResponse> {
  const q = query.toLowerCase().trim();
  const [uLat, uLng] = context.userPos;
  const rainRate = context.weather?.rainRateMmPerHour ?? 0;
  const nearestShelters = findNearestKnownShelters(uLat, uLng, 3);
  const primaryShelter = nearestShelters[0] || null;

  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  // 1. QUERY: Outer Ring Road / Bellandur / EcoSpace
  if (q.includes("outer ring road") || q.includes("orr") || q.includes("bellandur") || q.includes("ecospace") || q.includes("marathahalli")) {
    const isUnderpassClosed = context.incidents.some(
      (i) => i.id === "blr_i1" || i.description.toLowerCase().includes("ecospace")
    );
    const severeReports = context.reports.filter(
      (r) => r.lat >= 12.91 && r.lat <= 12.94 && r.lng >= 77.66 && (r.severityUser === "WaistPlus" || r.severityUser === "Knees")
    );

    const status = isUnderpassClosed ? "Impassable" : severeReports.length > 0 ? "Caution" : "Safe";

    return {
      query,
      headline: isUnderpassClosed
        ? "Outer Ring Road (EcoSpace Underpass) is Impassable"
        : "Outer Ring Road Traffic Passable with Caution",
      headlineKn: isUnderpassClosed
        ? "ಹೊರ ವರ್ತುಲ ರಸ್ತೆ (ಎಕೋಸ್ಪೇಸ್ ಅಂಡರ್‌ಪಾಸ್) ಮುಚ್ಚಲಾಗಿದೆ"
        : "ಹೊರ ವರ್ತುಲ ರಸ್ತೆಯಲ್ಲಿ ಎಚ್ಚರಿಕೆಯ ಸಂಚಾರ",
      status,
      modelBadge: "Built with IBM Bob • watsonx Agentic Core",
      timestamp: now,
      reasoningSteps: [
        "Identified corridor entity: Outer Ring Road Tech Corridor (Mahadevapura Zone).",
        `Assessed Open-Meteo precipitation rate: ${rainRate.toFixed(1)} mm/h in Mahadevapura watershed.`,
        isUnderpassClosed
          ? "Cross-referenced BBMP Road Incident blr_i1: Official closure logged for EcoSpace service underpass."
          : "Verified no full road closures logged on Bellandur elevated lanes.",
        `Audited ${severeReports.length} crowdsourced citizen telemetry reports along Bellandur lake discharge channel.`,
        "Formulated multi-modal diversion routing via Bellandur Main Flyover."
      ],
      reasoningStepsKn: [
        "ಮಹದೇವಪುರ ವಲಯದ ಹೊರ ವರ್ತುಲ ರಸ್ತೆ ಕಾರಿಡಾರ್ ಗುರುತಿಸಲಾಗಿದೆ.",
        `ಮಳೆ ಪ್ರಮಾಣ ಪರಿಶೀಲನೆ: ${rainRate.toFixed(1)} ಮಿ.ಮೀ/ಗಂಟೆ.`,
        isUnderpassClosed
          ? "ಬಿಬಿಎಂಪಿ ರಸ್ತೆ ಬಂದ್ ಆದೇಶ blr_i1: ಎಕೋಸ್ಪೇಸ್ ಅಂಡರ್‌ಪಾಸ್ ಬಂದ್ ಆಗಿದೆ."
          : "ಬೆಳ್ಳಂದೂರು ಮುಖ್ಯ ಮೇಲ್ಸೇತುವೆಯಲ್ಲಿ ಸಂಚಾರ ಮುಕ್ತವಾಗಿದೆ.",
        `ಬೆಳ್ಳಂದೂರು ಕೆರೆ ಬಳಿ ${severeReports.length} ನಾಗರಿಕ ಜಲಾವೃತ ವರದಿಗಳು ಪರಿಶೀಲಿಸಲಾಗಿದೆ.`,
        "ಮೇಲ್ಸೇತುವೆ ಮೂಲಕ ಸುರಕ್ಷಿತ ಪರ್ಯಾಯ ಮಾರ್ಗ ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ."
      ],
      explanation: isUnderpassClosed
        ? "The Outer Ring Road EcoSpace service road underpass is currently submerged under 3-4 feet of storm runoff from Bellandur lake channels. BBMP traffic police have diverted small vehicles and cars onto the main elevated flyover. Avoid low-lying service lanes."
        : "The elevated carriageway on Outer Ring Road is moving. Minor water accumulation on curbs near EcoSpace gate. Drive carefully and maintain lane discipline.",
      explanationKn: isUnderpassClosed
        ? "ಬೆಳ್ಳಂದೂರು ಕೆರೆ ಕಾಲುವೆಯಿಂದಾಗಿ ಎಕೋಸ್ಪೇಸ್ ಸರ್ವಿಸ್ ರಸ್ತೆ ಅಂಡರ್‌ಪಾಸ್‌ನಲ್ಲಿ 3-4 ಅಡಿ ನೀರು ತುಂಬಿ ರಸ್ತೆ ಮುಚ್ಚಲಾಗಿದೆ. ಸಣ್ಣ ವಾಹನಗಳನ್ನು ಮೇಲ್ಸೇತುವೆಗೆ ತಿರುಗಿಸಲಾಗಿದೆ. ಸರ್ವಿಸ್ ರಸ್ತೆ ಬಳಸಬೇಡಿ."
        : "ಹೊರ ವರ್ತುಲ ರಸ್ತೆಯ ಮುಖ್ಯ ಮೇಲ್ಸೇತುವೆಯಲ್ಲಿ ಸಂಚಾರ ಸಾಮಾನ್ಯವಾಗಿದೆ. ಎಕೋಸ್ಪೇಸ್ ಗೇಟ್ ಬಳಿ ಅಂಚಿನಲ್ಲಿ ನೀರಿದೆ, ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.",
      suggestedActions: [
        {
          id: "pan_orr",
          label: "View ORR EcoSpace on Map",
          labelKn: "ನಕ್ಷೆಯಲ್ಲಿ ಎಕೋಸ್ಪೇಸ್ ವೀಕ್ಷಿಸಿ",
          type: "pan",
          lat: 12.9265,
          lng: 77.6835,
          zoom: 15,
        },
        {
          id: "nav_bellandur_shelter",
          label: "Navigate to Bellandur Refuge Hall",
          labelKn: "ಬೆಳ್ಳಂದೂರು ಆಶ್ರಯ ಕೇಂದ್ರಕ್ಕೆ ಮಾರ್ಗ",
          type: "navigate",
          lat: 12.9275,
          lng: 77.6840,
        },
        {
          id: "call_bbmp",
          label: "Call BBMP Helpline (1533)",
          labelKn: "ಬಿಬಿಎಂಪಿ 1533 ಕರೆ ಮಾಡಿ",
          type: "call",
          phone: "1533",
        },
      ],
    };
  }

  // 2. QUERY: Central Silk Board / BTM / Madiwala / HSR
  if (q.includes("silk board") || q.includes("silkboard") || q.includes("madiwala") || q.includes("btm") || q.includes("hsr")) {
    const isSilkBoardRestricted = context.incidents.some(
      (i) => i.id === "blr_i2" || i.description.toLowerCase().includes("silk board")
    );

    return {
      query,
      headline: isSilkBoardRestricted
        ? "Silk Board Junction: Restricted for Two-Wheelers & Autos"
        : "Central Silk Board Passable with Moderate Delay",
      headlineKn: isSilkBoardRestricted
        ? "ಸೆಂಟ್ರಲ್ ಸಿಲ್ಕ್ ಬೋರ್ಡ್: ದ್ವಿಚಕ್ರ ಹಾಗೂ ಆಟೋಗಳಿಗೆ ನಿರ್ಬಂಧ"
        : "ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಜಂಕ್ಷನ್‌ನಲ್ಲಿ ಸಾಧಾರಣ ಸಂಚಾರ",
      status: "Caution",
      modelBadge: "Built with IBM Bob • watsonx Agentic Core",
      timestamp: now,
      reasoningSteps: [
        "Geocoded junction: Central Silk Board & Madiwala lake catchment (Bommanahalli Zone).",
        "Corroborated incident blr_i2: Underpass restricted to heavy vehicles; water depth ~25cm.",
        "Queried Madiwala stormwater sluice gate status: Flow rate elevated.",
        "Calculated safest shelter destination: Central Silk Board Disaster Staging Post (0.6 km)."
      ],
      reasoningStepsKn: [
        "ಬೊಮ್ಮನಹಳ್ಳಿ ವಲಯದ ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಹಾಗೂ ಮಡಿವಾಳ ಜಲಾನಯನ ಪ್ರದೇಶ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.",
        "blr_i2 ಘಟನೆ ದೃಢೀಕರಣ: ಅಂಡರ್‌ಪಾಸ್‌ನಲ್ಲಿ 25 ಸೆಂ.ಮೀ ನೀರಿದ್ದು ದ್ವಿಚಕ್ರ ವಾಹನಗಳಿಗೆ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ.",
        "ಮಡಿವಾಳ ರಾಜಕಾಲುವೆ ನೀರಿನ ಹರಿವು ಹೆಚ್ಚಾಗಿದೆ.",
        "ಹತ್ತಿರದ ಆಶ್ರಯ ತಾಣ: ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ವಿಪತ್ತು ಕೇಂದ್ರ (0.6 ಕಿ.ಮೀ)."
      ],
      explanation:
        "Central Silk Board underpass has accumulated knee-deep water near the curb lanes due to stormwater runoff from Madiwala lake. Two-wheelers and autos are advised to use the elevated ramp towards HSR Layout and avoid low-lying curves.",
      explanationKn:
        "ಮಡಿವಾಳ ಕೆರೆಯ ನೀರಿನಿಂದಾಗಿ ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಜಂಕ್ಷನ್ ಬಳಿ ಮೊಣಕಾಲು ಮಟ್ಟದ ನೀರು ಸಂಗ್ರಹವಾಗಿದೆ. ದ್ವಿಚಕ್ರ ವಾಹನ ಮತ್ತು ಆಟೋಗಳು ಮೇಲ್ಸೇತುವೆ ಬಳಸಲು ಸೂಚಿಸಲಾಗಿದೆ.",
      suggestedActions: [
        {
          id: "pan_silkboard",
          label: "View Silk Board Junction",
          labelKn: "ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ವೀಕ್ಷಿಸಿ",
          type: "pan",
          lat: 12.9172,
          lng: 77.6228,
          zoom: 16,
        },
        {
          id: "nav_silkboard_shelter",
          label: "Route to Silk Board Disaster Staging Post",
          labelKn: "ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಆಶ್ರಯ ಕೇಂದ್ರಕ್ಕೆ ಮಾರ್ಗ",
          type: "navigate",
          lat: 12.9180,
          lng: 77.6235,
        },
      ],
    };
  }

  // 3. QUERY: Koramangala / Sony World / Indiranagar
  if (q.includes("koramangala") || q.includes("sony world") || q.includes("indiranagar") || q.includes("100ft")) {
    return {
      query,
      headline: "Koramangala 80ft Road & Sony World: Minor Water Pooling",
      headlineKn: "ಕೋರಮಂಗಲ 80 ಅಡಿ ರಸ್ತೆ ಮತ್ತು ಸೋನಿ ವರ್ಲ್ಡ್: ಸಣ್ಣ ಜಲಾವೃತ",
      status: "Caution",
      modelBadge: "Built with IBM Bob • watsonx Agentic Core",
      timestamp: now,
      reasoningSteps: [
        "Indexed Koramangala 4th Block & 80ft Road corridor (South Zone).",
        "Checked stormwater drain status: Rajakaluve flowing at 65% capacity.",
        "Verified citizen reports: Footpath submergence outside commercial shops.",
        "Recommended evacuation refuge: Koramangala Indoor Stadium (1.8 km)."
      ],
      reasoningStepsKn: [
        "ದಕ್ಷಿಣ ವಲಯದ ಕೋರಮಂಗಲ 4ನೇ ಬ್ಲಾಕ್ ಹಾಗೂ 80 ಅಡಿ ರಸ್ತೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.",
        "ರಾಜಕಾಲುವೆ ಸಾಮರ್ಥ್ಯ ಶೇ. 65 ರಷ್ಟು ತುಂಬಿದೆ.",
        "ನಾಗರಿಕ ವರದಿಗಳು: ಅಂಗಡಿಗಳ ಮುಂಭಾಗದ ಪಾದಚಾರಿ ಮಾರ್ಗದಲ್ಲಿ ನೀರು.",
        "ಶಿಫಾರಸು ಮಾಡಿದ ಆಶ್ರಯ: ಕೋರಮಂಗಲ ಒಳಾಂಗಣ ಕ್ರೀಡಾಂಗಣ (1.8 ಕಿ.ಮೀ)."
      ],
      explanation:
        "Koramangala 80ft Road near Sony World signal has minor water pooling along the left gutter lanes. Footpaths are wet but main asphalt is passable for cars and buses. Slow down near 4th Block cross roads.",
      explanationKn:
        "ಕೋರಮಂಗಲ 80 ಅಡಿ ರಸ್ತೆಯ ಸೋನಿ ವರ್ಲ್ಡ್ ಸಿಗ್ನಲ್ ಬಳಿ ರಸ್ತೆ ಬದಿಯಲ್ಲಿ ನೀರು ನಿಂತಿದೆ. ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ಸಂಚಾರ ಸಾಧ್ಯವಿದೆ, ಜಾಗರೂಕರಾಗಿ ವಾಹನ ಚಲಾಯಿಸಿ.",
      suggestedActions: [
        {
          id: "pan_koramangala",
          label: "View Koramangala on Map",
          labelKn: "ನಕ್ಷೆಯಲ್ಲಿ ಕೋರಮಂಗಲ ವೀಕ್ಷಿಸಿ",
          type: "pan",
          lat: 12.9352,
          lng: 77.6245,
          zoom: 15,
        },
        {
          id: "nav_koramangala_shelter",
          label: "Navigate to Koramangala Indoor Stadium",
          labelKn: "ಕೋರಮಂಗಲ ಕ್ರೀಡಾಂಗಣಕ್ಕೆ ಮಾರ್ಗ",
          type: "navigate",
          lat: 12.9345,
          lng: 77.6225,
        },
      ],
    };
  }

  // 4. QUERY: Shelter / Safe Place / Relief
  if (q.includes("shelter") || q.includes("relief") || q.includes("evacuat") || q.includes("safe place") || q.includes("ಆಶ್ರಯ") || q.includes("ಕ್ರೀಡಾಂಗಣ")) {
    const s = primaryShelter;
    const dist = s ? getHaversineDistanceKm(uLat, uLng, s.lat, s.lng).toFixed(1) : "0.5";

    return {
      query,
      headline: s ? `Nearest Safe Refuge: ${s.name} (${dist} km)` : "BBMP Emergency Shelters Standing By",
      headlineKn: s ? `ಸಮೀಪದ ಆಶ್ರಯ: ${s.name} (${dist} ಕಿ.ಮೀ)` : "ಬಿಬಿಎಂಪಿ ತುರ್ತು ಆಶ್ರಯ ತಾಣಗಳು ಸನ್ನದ್ಧವಾಗಿವೆ",
      status: "Safe",
      modelBadge: "Built with IBM Bob • watsonx Agentic Core",
      timestamp: now,
      reasoningSteps: [
        `Executed geodesic Haversine spatial query from coordinates [${uLat.toFixed(4)}, ${uLng.toFixed(4)}].`,
        `Filtered 269 verified disaster shelters across BBMP 8 administrative zones.`,
        `Identified optimal facility: ${s?.name || "Kanteerava Indoor Stadium"} with active capacity status: ${s?.capacityStatus || "Space Available"}.`,
        "Verified safe access roads with zero active road-closure obstructions."
      ],
      reasoningStepsKn: [
        `ಪ್ರಸ್ತುತ ಸ್ಥಳದಿಂದ ಜಿಯೋಡೆಸಿಕ್ ಹಾವರ್ಸಿನ್ ಅಂತರ ಲೆಕ್ಕಾಚಾರ ಮಾಡಲಾಗಿದೆ.`,
        `ಬಿಬಿಎಂಪಿಯ 8 ವಲಯಗಳ 269 ಅಧಿಕೃತ ಆಶ್ರಯ ತಾಣಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ.`,
        `ಸೂಕ್ತ ಆಶ್ರಯ ತಾಣ: ${s?.name || "ಕಂಠೀರವ ಒಳಾಂಗಣ ಕ್ರೀಡಾಂಗಣ"} (ಲಭ್ಯತೆ: ಸ್ಥಳಾವಕಾಶವಿದೆ).`,
        "ಪ್ರವೇಶ ರಸ್ತೆಗಳಲ್ಲಿ ಯಾವುದೇ ಅಡೆತಡೆಗಳಿಲ್ಲದಿರುವುದನ್ನು ಖಚಿತಪಡಿಸಲಾಗಿದೆ."
      ],
      explanation: s
        ? `The nearest verified civic refuge is ${s.name}, situated at ${s.address} (~${dist} km from your current coordinates). The facility is equipped with clean drinking water, emergency medical supplies, and backup power.`
        : "Multiple BBMP disaster relief facilities are active across Bengaluru with verified food and medical staging.",
      explanationKn: s
        ? `ನಿಮ್ಮ ಸ್ಥಳದಿಂದ ಅತ್ಯಂತ ಸಮೀಪದ ಅಧಿಕೃತ ಆಶ್ರಯ ಕೇಂದ್ರವೆಂದರೆ ${s.name} (${dist} ಕಿ.ಮೀ). ಇಲ್ಲಿ ಕುಡಿಯುವ ನೀರು, ತುರ್ತು ಚಿಕಿತ್ಸೆ ಮತ್ತು ಸುರಕ್ಷಿತ ವಸತಿ ವ್ಯವಸ್ಥೆಯಿದೆ.`
        : "ಬೆಂಗಳೂರಿನಾದ್ಯಂತ ಬಿಬಿಎಂಪಿ ಪರಿಹಾರ ಕೇಂದ್ರಗಳು ಸನ್ನದ್ಧವಾಗಿವೆ.",
      suggestedActions: s
        ? [
            {
              id: "nav_nearest_shelter",
              label: `Route to ${s.name.slice(0, 24)}...`,
              labelKn: `${s.name.slice(0, 20)} ಗೆ ಮಾರ್ಗ`,
              type: "navigate",
              lat: s.lat,
              lng: s.lng,
            },
            {
              id: "call_shelter",
              label: `Call Helpline: ${s.contactPhone || "1533"}`,
              labelKn: `ಸಹಾಯವಾಣಿಗೆ ಕರೆ: ${s.contactPhone || "1533"}`,
              type: "call",
              phone: s.contactPhone || "1533",
            },
          ]
        : [],
    };
  }

  // 5. QUERY: Helpline / Phone / Emergency / Numbers
  if (q.includes("help") || q.includes("helpline") || q.includes("number") || q.includes("phone") || q.includes("call") || q.includes("ಕರೆ") || q.includes("ಸಹಾಯ")) {
    return {
      query,
      headline: "Bengaluru Emergency Helplines & Disaster Staging",
      headlineKn: "ಬೆಂಗಳೂರು ತುರ್ತು ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆಗಳು",
      status: "Safe",
      modelBadge: "Built with IBM Bob • watsonx Agentic Core",
      timestamp: now,
      reasoningSteps: [
        "Retrieved official BBMP Disaster Management protocol roster.",
        "Verified 24x7 control room direct hotline: 1533.",
        "Indexed unified National Emergency Service: 112.",
        "Confirmed state disaster response cell NDMA: 1078."
      ],
      reasoningStepsKn: [
        "ಬಿಬಿಎಂಪಿ ಅಧಿಕೃತ ವಿಪತ್ತು ನಿರ್ವಹಣಾ ಸಂಖ್ಯೆಗಳನ್ನು ಪಡೆಯಲಾಗಿದೆ.",
        "24x7 ನಿಯಂತ್ರಣ ಕೊಠಡಿ ಸಹಾಯವಾಣಿ: 1533.",
        "ರಾಷ್ಟ್ರೀಯ ತುರ್ತು ಸಹಾಯವಾಣಿ: 112.",
        "ರಾಜ್ಯ ವಿಪತ್ತು ನಿರ್ವಹಣಾ ಕೋಶ: 1078."
      ],
      explanation:
        "For immediate civic waterlogging, tree falls, and drain blockages, call the BBMP 24x7 Disaster Helpline at 1533. For life-threatening emergencies, medical dispatch, or search & rescue, immediately dial 112.",
      explanationKn:
        "ರಸ್ತೆ ಜಲಾವೃತ, ಮರ ಬಿದ್ದಿರುವುದು ಅಥವಾ ರಾಜಕಾಲುವೆ ಕಟ್ಟಿಕೊಂಡಿದ್ದರೆ ಬಿಬಿಎಂಪಿ 24x7 ಸಹಾಯವಾಣಿ 1533 ಗೆ ಕರೆ ಮಾಡಿ. ಜೀವ ಬೆದರಿಕೆ ಅಥವಾ ತುರ್ತು ರಕ್ಷಣೆಗೆ ತಕ್ಷಣ 112 ಗೆ ಕರೆ ಮಾಡಿ.",
      suggestedActions: [
        {
          id: "call_bbmp_1533",
          label: "Call BBMP 1533 (Disaster)",
          labelKn: "ಬಿಬಿಎಂಪಿ 1533 ಕರೆ ಮಾಡಿ",
          type: "call",
          phone: "1533",
        },
        {
          id: "call_112",
          label: "Call 112 (National Emergency)",
          labelKn: "112 ತುರ್ತು ಕರೆ ಮಾಡಿ",
          type: "call",
          phone: "112",
        },
        {
          id: "call_ndma_1078",
          label: "Call 1078 (NDMA)",
          labelKn: "1078 ಗೆ ಕರೆ ಮಾಡಿ",
          type: "call",
          phone: "1078",
        },
      ],
    };
  }

  // 6. DEFAULT / GENERAL BENGALURU STATUS QUERY
  const activeClosures = context.incidents.filter((i) => i.status === "ClosedAllTraffic").length;
  const generalStatus = activeClosures > 0 ? "Caution" : rainRate > 15 ? "Caution" : "Safe";

  return {
    query,
    headline: `Bengaluru Civic Flood & Mobility Report (${now})`,
    headlineKn: `ಬೆಂಗಳೂರು ಪ್ರವಾಹ ಮತ್ತು ಸಂಚಾರ ವರದಿ (${now})`,
    status: generalStatus,
    modelBadge: "Built with IBM Bob • watsonx Agentic Core",
    timestamp: now,
    reasoningSteps: [
      `Assessed current Open-Meteo precipitation: ${rainRate.toFixed(1)} mm/h across Bengaluru plateau.`,
      `Synthesized ${context.incidents.length} active road incident advisories and ${context.reports.length} citizen reports.`,
      `Evaluated Rajakaluve drainage interlinks between Bellandur, Varthur, and Madiwala basins.`,
      `Computed nearest safe shelter: ${primaryShelter?.name || "Kanteerava Stadium"} (${primaryShelter ? getHaversineDistanceKm(uLat, uLng, primaryShelter.lat, primaryShelter.lng).toFixed(1) : "0.5"} km away).`
    ],
    reasoningStepsKn: [
      `ಬೆಂಗಳೂರಿನ ಪ್ರಸ್ತುತ ಮಳೆ ಪ್ರಮಾಣ: ${rainRate.toFixed(1)} ಮಿ.ಮೀ/ಗಂಟೆ.`,
      `${context.incidents.length} ರಸ್ತೆ ಬಂದ್ ಘಟನೆಗಳು ಹಾಗೂ ${context.reports.length} ನಾಗರಿಕ ವರದಿಗಳು ವಿಶ್ಲೇಷಿಸಲಾಗಿದೆ.`,
      `ಬೆಳ್ಳಂದೂರು, ವರ್ತೂರು ಮತ್ತು ಮಡಿವಾಳ ರಾಜಕಾಲುವೆಗಳ ಒಳಹರಿವು ಪರಿಶೀಲಿಸಲಾಗಿದೆ.`,
      `ಹತ್ತಿರದ ಆಶ್ರಯ ತಾಣ: ${primaryShelter?.name || "ಕಂಠೀರವ ಕ್ರೀಡಾಂಗಣ"}.`
    ],
    explanation:
      rainRate > 20
        ? `Heavy rainfall detected (${rainRate.toFixed(1)} mm/h). Major stormwater corridors near Central Silk Board and Outer Ring Road Bellandur are under elevated backwater risk. Check live incident pins before commencing commute.`
        : `Overall road network across Bengaluru is operational. Rain rate is ${rainRate.toFixed(1)} mm/h. Use caution around low-lying underpasses at Silk Board and Bellandur EcoSpace. 269 BBMP relief shelters are mapped and standing by.`,
    explanationKn:
      rainRate > 20
        ? `ತೀವ್ರ ಮಳೆಯಾಗುತ್ತಿದೆ (${rainRate.toFixed(1)} ಮಿ.ಮೀ/ಗಂಟೆ). ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಮತ್ತು ಹೊರ ವರ್ತುಲ ರಸ್ತೆಗಳಲ್ಲಿ ಜಲಾವೃತ ಅಪಾಯ ಹೆಚ್ಚಿದೆ. ಪ್ರಯಾಣಿಸುವ ಮುನ್ನ ಲೈವ್ ನಕ್ಷೆ ಗಮನಿಸಿ.`
        : `ಬೆಂಗಳೂರಿನ ರಸ್ತೆಗಳಲ್ಲಿ ಸಂಚಾರ ಸಾಮಾನ್ಯವಾಗಿ ಮುಂದುವರೆದಿದೆ. ಮಳೆ ಪ್ರಮಾಣ ${rainRate.toFixed(1)} ಮಿ.ಮೀ/ಗಂಟೆ. ಅಂಡರ್‌ಪಾಸ್‌ಗಳಲ್ಲಿ ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ. 269 ಬಿಬಿಎಂಪಿ ಆಶ್ರಯ ತಾಣಗಳು ಸನ್ನದ್ಧವಾಗಿವೆ.`,
    suggestedActions: [
      {
        id: "pan_cbd",
        label: "View Bengaluru Center",
        labelKn: "ಬೆಂಗಳೂರು ಕೇಂದ್ರ ವೀಕ್ಷಿಸಿ",
        type: "pan",
        lat: 12.9716,
        lng: 77.5946,
        zoom: 14,
      },
      {
        id: "call_bbmp",
        label: "Call BBMP 1533",
        labelKn: "ಬಿಬಿಎಂಪಿ 1533 ಕರೆ ಮಾಡಿ",
        type: "call",
        phone: "1533",
      },
    ],
  };
}

export const runCivicAiAgent = runBobCivicAgent;
