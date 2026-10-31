import type { RoadRouteResult, RoadRouteStep, Shelter } from "./types";
import { assertZeroCostUrl } from "../guards/zeroCostGuard";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_ELEVATION = "https://api.open-meteo.com/v1/elevation";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

// Statically verify all configured endpoints conform to $0 zero-cost rules
assertZeroCostUrl(NOMINATIM_BASE);
assertZeroCostUrl(OPEN_METEO_BASE);
assertZeroCostUrl(OPEN_METEO_ELEVATION);
OVERPASS_ENDPOINTS.forEach((ep) => assertZeroCostUrl(ep));
assertZeroCostUrl(OSRM_BASE);

// ---------------------------------------------------------------------------
// CACHING
// ---------------------------------------------------------------------------
const cache = new Map<string, { timestamp: number; data: unknown }>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > ttlMs) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCached(key: string, data: unknown) {
  cache.set(key, { timestamp: Date.now(), data });
}

// ---------------------------------------------------------------------------
// 1. PLACE SEARCH (OSM Nominatim)
// ---------------------------------------------------------------------------
export interface PlaceSearchResult {
  placeId: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
}

export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const cacheKey = `nom_${clean.toLowerCase()}`;
  const cached = getCached<PlaceSearchResult[]>(cacheKey, 30 * 60 * 1000);
  if (cached) return cached;

  try {
    const url = `${NOMINATIM_BASE}?format=json&q=${encodeURIComponent(clean)}&addressdetails=1&limit=6`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as Array<{
      place_id: number;
      name?: string;
      display_name: string;
      lat: string;
      lon: string;
      type: string;
    }>;

    const results: PlaceSearchResult[] = raw.map((item) => ({
      placeId: String(item.place_id),
      name: item.name || item.display_name.split(",")[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
    }));

    setCached(cacheKey, results);
    return results;
  } catch (err) {
    console.warn("Place search failed:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 2. REAL GPS GEOLOCATION
// ---------------------------------------------------------------------------
export interface GeolocationResult {
  lat: number;
  lng: number;
  accuracy: number;
}

export function getCurrentUserGps(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return reject(new Error("Geolocation is not supported by your browser."));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = "Could not retrieve your location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access in your browser.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out. Please try again.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  });
}

// ---------------------------------------------------------------------------
// 3. REAL RAINFALL & FORECAST (Open-Meteo)
// ---------------------------------------------------------------------------
export interface RealWeatherResult {
  recentRainMm: number; // last hour
  forecastRain3hMm: number; // next 3 hours
  hourlyTimes: string[];
  hourlyRainMm: number[];
  temperatureC?: number;
  weatherCode?: number;
}

export async function fetchRealWeather(lat: number, lng: number): Promise<RealWeatherResult> {
  // Snap coordinates to 0.05 degrees (~5 km) for effective weather caching
  const snapLat = Math.round(lat * 20) / 20;
  const snapLng = Math.round(lng * 20) / 20;
  const cacheKey = `weather_${snapLat}_${snapLng}`;

  const cached = getCached<RealWeatherResult>(cacheKey, 15 * 60 * 1000);
  if (cached) return cached;

  try {
    const url = `${OPEN_METEO_BASE}?latitude=${snapLat}&longitude=${snapLng}&hourly=precipitation,rain&current=precipitation,temperature_2m,weather_code&forecast_hours=6&past_hours=2&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather service unavailable");
    const json = await res.json();

    const hourly = json.hourly || {};
    const rainArr: number[] = hourly.precipitation || hourly.rain || [];
    const times: string[] = hourly.time || [];

    // Find current hour index
    const nowIso = new Date().toISOString().slice(0, 13);
    let currentIdx = times.findIndex((t: string) => t.startsWith(nowIso));
    if (currentIdx === -1) currentIdx = Math.min(2, rainArr.length - 1);

    const pastHourRain = rainArr[currentIdx] || json.current?.precipitation || 0;
    const next3h = (rainArr.slice(currentIdx + 1, currentIdx + 4) || []).reduce(
      (a: number, b: number) => a + (b || 0),
      0,
    );

    const result: RealWeatherResult = {
      recentRainMm: Math.round(pastHourRain * 10) / 10,
      forecastRain3hMm: Math.round(next3h * 10) / 10,
      hourlyTimes: times.slice(Math.max(0, currentIdx - 1), currentIdx + 5),
      hourlyRainMm: rainArr.slice(Math.max(0, currentIdx - 1), currentIdx + 5),
      temperatureC: json.current?.temperature_2m,
      weatherCode: json.current?.weather_code,
    };

    setCached(cacheKey, result);
    return result;
  } catch (e) {
    console.warn("Open-Meteo weather fetch error:", e);
    return {
      recentRainMm: 0,
      forecastRain3hMm: 0,
      hourlyTimes: [],
      hourlyRainMm: [],
    };
  }
}

// ---------------------------------------------------------------------------
// 4. REAL ELEVATION & TOPOGRAPHY (Open-Meteo Elevation)
// ---------------------------------------------------------------------------
export async function fetchElevation(lat: number, lng: number): Promise<number> {
  const snapLat = Math.round(lat * 100) / 100;
  const snapLng = Math.round(lng * 100) / 100;
  const cacheKey = `elev_${snapLat}_${snapLng}`;

  const cached = getCached<number>(cacheKey, 24 * 60 * 60 * 1000);
  if (cached !== null) return cached;

  try {
    const url = `${OPEN_METEO_ELEVATION}?latitude=${snapLat}&longitude=${snapLng}`;
    const res = await fetch(url);
    if (!res.ok) return 10;
    const json = await res.json();
    const elev = json.elevation?.[0] ?? 10;
    setCached(cacheKey, elev);
    return elev;
  } catch {
    return 10;
  }
}

// ---------------------------------------------------------------------------
// 5. REAL SHELTERS (OpenStreetMap Overpass API)
// ---------------------------------------------------------------------------
export async function fetchOsmShelters(bbox: {
  south: number;
  west: number;
  north: number;
  east: number;
}): Promise<Shelter[]> {
  const cacheKey = `shelters_${bbox.south.toFixed(2)}_${bbox.west.toFixed(2)}_${bbox.north.toFixed(2)}_${bbox.east.toFixed(2)}`;
  const cached = getCached<Shelter[]>(cacheKey, 60 * 60 * 1000);
  if (cached) return cached;

  const query = `
[out:json][timeout:6];
(
  node["amenity"="shelter"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["amenity"="community_centre"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["amenity"="hospital"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["amenity"="school"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["amenity"="community_centre"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out center 30;
`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`);
      if (!res.ok) continue;
      const json = await res.json();
      const elements = json.elements || [];

      const shelters: Shelter[] = elements.map(
        (
          el: {
            id: number;
            lat?: number;
            lon?: number;
            center?: { lat: number; lon: number };
            tags?: Record<string, string>;
          },
          idx: number,
        ) => {
          const lat = el.lat || el.center?.lat || 0;
          const lng = el.lon || el.center?.lon || 0;
          const tags = el.tags || {};
          const name = tags.name || tags["name:en"] || `Shelter Point #${idx + 1}`;
          const amenity = tags.amenity || "community_centre";

          let kind: Shelter["kind"] = "Community Hall";
          if (amenity === "school") kind = "School";
          else if (amenity === "hospital") kind = "Municipal Building";
          else if (amenity === "shelter") kind = "Community Hall";

          return {
            id: `osm_sh_${el.id}`,
            name,
            address: tags["addr:street"]
              ? `${tags["addr:street"]} ${tags["addr:housenumber"] || ""}`
              : `${kind} Point`,
            lat,
            lng,
            kind,
            capacityStatus: "Space available" as const,
            provenance: "Official Verified" as const,
            accessibilityNote: tags.wheelchair === "yes" ? "Wheelchair accessible" : undefined,
          };
        },
      );

      if (shelters.length > 0) {
        setCached(cacheKey, shelters);
        return shelters;
      }
    } catch (e) {
      console.warn("Overpass endpoint failed, trying next:", e);
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// 6. SAFE ROAD ROUTING (OSRM)
// ---------------------------------------------------------------------------
export async function calculateWorldwideSafeRoute(
  start: [number, number],
  destination: [number, number],
  blockedPoints?: Array<{ lat: number; lng: number; description: string }>,
): Promise<RoadRouteResult | null> {
  const url = `${OSRM_BASE}/${start[1]},${start[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM service response not OK");
    const json = await res.json();
    const route = json.routes?.[0];
    if (!route) return null;

    const coords: [number, number][] = (route.geometry?.coordinates || []).map(
      (c: [number, number]) => [c[1], c[0]], // [lat, lng]
    );

    const steps: RoadRouteStep[] = (route.legs?.[0]?.steps || []).map(
      (s: {
        maneuver?: { type: string; modifier?: string };
        name?: string;
        distance: number;
        duration: number;
      }) => ({
        instruction: s.maneuver?.type
          ? `${s.maneuver.type} ${s.maneuver.modifier || ""}`.trim()
          : "Continue",
        streetName: s.name || "Unnamed Road",
        distanceMeters: Math.round(s.distance || 0),
        durationSeconds: Math.round(s.duration || 0),
      }),
    );

    // Check intersection with any active road closures / deep water
    let blockedClosure: RoadRouteResult["blockedByClosure"] = undefined;
    let safetyScore = 95;
    let safetyStatus: RoadRouteResult["safetyStatus"] = "Safe";
    let safetyMessage = "Clear road route. No impassable water reported.";
    const warnings: string[] = [];

    if (blockedPoints && blockedPoints.length > 0) {
      for (const bp of blockedPoints) {
        // Find minimum distance from any route coordinate to blocked point
        for (const coord of coords) {
          const dLat = coord[0] - bp.lat;
          const dLng = coord[1] - bp.lng;
          const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
          if (distKm < 0.12) {
            // within ~120 meters
            blockedClosure = {
              incidentId: "closure_intersect",
              description: bp.description,
              location: `Near route path (${Math.round(distKm * 1000)}m away)`,
            };
            safetyScore = 15;
            safetyStatus = "Impassable";
            safetyMessage = `Route passes near active road closure: ${bp.description}. Detour required.`;
            warnings.push(safetyMessage);
            break;
          }
        }
        if (blockedClosure) break;
      }
    }

    return {
      coordinates: coords,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      steps,
      safetyScore,
      safetyStatus,
      safetyMessage,
      blockedByClosure: blockedClosure,
      counts: {
        Low: safetyStatus === "Safe" ? 1 : 0,
        Moderate: 0,
        High: 0,
        Critical: safetyStatus === "Impassable" ? 1 : 0,
      },
      dangerWarnings: warnings,
      provider: "OSRM",
    };
  } catch (err) {
    console.warn("OSRM routing failed, fallback to straight corridor line:", err);
    return null;
  }
}
