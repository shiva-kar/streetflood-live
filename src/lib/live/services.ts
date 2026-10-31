/** Free public data services, called straight from the browser. */

const cache = new Map<string, { t: number; v: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v as T;
  try {
    const raw = localStorage.getItem(`sfc:${key}`);
    if (raw) {
      const p = JSON.parse(raw) as { t: number; v: T };
      if (Date.now() - p.t < ttlMs) {
        cache.set(key, p);
        return p.v;
      }
    }
  } catch {
    /* ignore */
  }
  const v = await fn();
  const entry = { t: Date.now(), v };
  cache.set(key, entry);
  try {
    localStorage.setItem(`sfc:${key}`, JSON.stringify(entry));
  } catch {
    /* storage full */
  }
  return v;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Service unavailable (${res.status})`);
  return res.json() as Promise<T>;
}

// ---------- Weather (Open-Meteo) ----------
export interface Weather {
  rainNowMm: number;
  next3hMm: number;
  next3hHourly: number[];
  elevationM: number | null;
  updatedAt: string;
}

export function getWeather(lat: number, lng: number): Promise<Weather> {
  const k = `wx:${lat.toFixed(2)},${lng.toFixed(2)}`;
  return cached(k, 10 * 60_000, async () => {
    const d = await getJson<{
      elevation?: number;
      current?: { precipitation?: number; time?: string };
      hourly?: { time: string[]; precipitation: number[] };
    }>(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation&hourly=precipitation&forecast_hours=4&timezone=auto`,
    );
    const hourly = d.hourly?.precipitation?.slice(1, 4) ?? [];
    return {
      rainNowMm: d.current?.precipitation ?? 0,
      next3hMm: hourly.reduce((a, b) => a + (b || 0), 0),
      next3hHourly: hourly,
      elevationM: typeof d.elevation === "number" ? d.elevation : null,
      updatedAt: new Date().toISOString(),
    };
  });
}

// ---------- Geocoding (Nominatim, max 1 req/s) ----------
export interface Place {
  name: string;
  detail: string;
  lat: number;
  lng: number;
}

let lastNominatim = 0;
async function nominatim<T>(path: string): Promise<T> {
  const wait = Math.max(0, lastNominatim + 1100 - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastNominatim = Date.now();
  return getJson<T>(`https://nominatim.openstreetmap.org/${path}`, {
    headers: { "Accept-Language": navigator.language || "en" },
  });
}

export function searchPlaces(q: string): Promise<Place[]> {
  const query = q.trim();
  if (query.length < 3) return Promise.resolve([]);
  return cached(`geo:${query.toLowerCase()}`, 24 * 3600_000, async () => {
    const d = await nominatim<{ display_name: string; lat: string; lon: string; name?: string }[]>(
      `search?format=jsonv2&limit=6&q=${encodeURIComponent(query)}`,
    );
    return d.map((p) => {
      const parts = p.display_name.split(", ");
      return {
        name: p.name || parts[0],
        detail: parts.slice(1, 4).join(", "),
        lat: +p.lat,
        lng: +p.lon,
      };
    });
  });
}

export interface AreaInfo {
  label: string;
  countryCode: string;
}
export function reverseGeocode(lat: number, lng: number): Promise<AreaInfo> {
  return cached(`rev:${lat.toFixed(3)},${lng.toFixed(3)}`, 24 * 3600_000, async () => {
    const d = await nominatim<{
      address?: Record<string, string>;
      display_name?: string;
    }>(`reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lng}`);
    const a = d.address ?? {};
    const label =
      [a.road, a.suburb || a.neighbourhood || a.village, a.city || a.town || a.county]
        .filter(Boolean)
        .slice(0, 2)
        .join(", ") ||
      d.display_name?.split(", ").slice(0, 2).join(", ") ||
      "This area";
    return { label, countryCode: (a.country_code || "").toUpperCase() };
  });
}

// ---------- Help points (Overpass) ----------
export type HelpKind = "shelter" | "hospital" | "police" | "fire" | "school" | "community";
export interface HelpPoint {
  id: string;
  name: string;
  kind: HelpKind;
  lat: number;
  lng: number;
}
export const HELP_LABEL: Record<HelpKind, string> = {
  shelter: "Shelter",
  hospital: "Hospital",
  police: "Police",
  fire: "Fire station",
  school: "School (possible shelter)",
  community: "Community centre",
};

export function getHelpPoints(lat: number, lng: number, radiusM = 2500): Promise<HelpPoint[]> {
  return cached(`help:${lat.toFixed(2)},${lng.toFixed(2)}`, 6 * 3600_000, async () => {
    const around = `(around:${radiusM},${lat},${lng})`;
    const q = `[out:json][timeout:20];(
      nwr["amenity"~"^(hospital|police|fire_station|shelter|community_centre|school)$"]${around};
      nwr["emergency"="assembly_point"]${around};
    );out center 120;`;
    const d = await getJson<{
      elements: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
    }>("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(q),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const kindOf = (t: Record<string, string>): HelpKind => {
      if (t.emergency === "assembly_point" || t.amenity === "shelter") return "shelter";
      if (t.amenity === "hospital") return "hospital";
      if (t.amenity === "police") return "police";
      if (t.amenity === "fire_station") return "fire";
      if (t.amenity === "community_centre") return "community";
      return "school";
    };
    return d.elements
      .map((e) => {
        const t = e.tags ?? {};
        const p = e.center ?? (e.lat != null ? { lat: e.lat, lon: e.lon! } : null);
        if (!p) return null;
        const kind = kindOf(t);
        return {
          id: `${e.type}${e.id}`,
          name: t.name || HELP_LABEL[kind],
          kind,
          lat: p.lat,
          lng: p.lon,
        } satisfies HelpPoint;
      })
      .filter((x): x is HelpPoint => !!x && !(x.kind === "shelter" && x.name === "Shelter" && !x.id));
  });
}

// ---------- Routing (free OSRM servers) ----------
export type TravelMode = "foot" | "car";
export interface RouteOption {
  coords: [number, number][];
  distanceKm: number;
  minutes: number;
  steps: string[];
}

export async function getRoutes(
  from: [number, number],
  to: [number, number],
  mode: TravelMode,
): Promise<RouteOption[]> {
  const base =
    mode === "foot"
      ? "https://routing.openstreetmap.de/routed-foot/route/v1/foot"
      : "https://router.project-osrm.org/route/v1/driving";
  const d = await getJson<{
    code: string;
    routes: {
      distance: number;
      duration: number;
      geometry: { coordinates: [number, number][] };
      legs: { steps: { name: string; distance: number; maneuver: { type: string; modifier?: string } }[] }[];
    }[];
  }>(
    `${base}/${from[1]},${from[0]};${to[1]},${to[0]}?alternatives=3&overview=full&geometries=geojson&steps=true`,
  );
  if (d.code !== "Ok" || !d.routes.length) throw new Error("No road route found between these points.");
  return d.routes.map((r) => ({
    coords: r.geometry.coordinates.map(([x, y]) => [y, x] as [number, number]),
    distanceKm: r.distance / 1000,
    minutes: Math.max(1, Math.round(r.duration / 60)),
    steps: r.legs[0].steps
      .filter((s) => s.distance > 15 || s.maneuver.type === "arrive")
      .map((s) => {
        const turn =
          s.maneuver.type === "arrive"
            ? "Arrive at destination"
            : s.maneuver.type === "depart"
              ? "Start"
              : `${s.maneuver.modifier ? `Turn ${s.maneuver.modifier}` : "Continue"}`;
        return `${turn}${s.name ? ` on ${s.name}` : ""}${s.maneuver.type !== "arrive" ? ` · ${s.distance < 1000 ? Math.round(s.distance) + " m" : (s.distance / 1000).toFixed(1) + " km"}` : ""}`;
      }),
  }));
}

// ---------- Emergency numbers ----------
export interface Helpline {
  label: string;
  number: string;
}
const NUMBERS: Record<string, Helpline[]> = {
  IN: [
    { label: "Emergency (all services)", number: "112" },
    { label: "Disaster helpline", number: "1078" },
    { label: "Police", number: "100" },
    { label: "Fire", number: "101" },
    { label: "Ambulance", number: "108" },
  ],
  US: [{ label: "Emergency", number: "911" }],
  CA: [{ label: "Emergency", number: "911" }],
  GB: [
    { label: "Emergency", number: "999" },
    { label: "Floodline", number: "03459881188" },
  ],
  AU: [
    { label: "Emergency", number: "000" },
    { label: "SES flood & storm", number: "132500" },
  ],
  PK: [
    { label: "Rescue", number: "1122" },
    { label: "Police", number: "15" },
  ],
  BD: [{ label: "Emergency", number: "999" }],
  LK: [{ label: "Emergency", number: "119" }],
  NP: [{ label: "Police", number: "100" }],
  PH: [{ label: "Emergency", number: "911" }],
  ID: [{ label: "Emergency", number: "112" }],
};
export function helplinesFor(cc: string): Helpline[] {
  return NUMBERS[cc] ?? [{ label: "Emergency (works in most countries)", number: "112" }];
}
