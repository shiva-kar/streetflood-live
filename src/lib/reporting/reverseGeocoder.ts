export interface GeocodedPlace {
  displayName: string;
  road?: string;
  neighbourhood?: string;
  city?: string;
  ward?: string;
  source: "Nominatim";
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<GeocodedPlace> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Coordinates are required for reverse geocoding.");
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18`;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Reverse geocoding failed with HTTP ${response.status}.`);
  const payload = await response.json() as { display_name?: string; address?: Record<string, string> };
  if (!payload.display_name) throw new Error("Reverse geocoder returned no address.");
  return {
    displayName: payload.display_name,
    road: payload.address?.road,
    neighbourhood: payload.address?.neighbourhood ?? payload.address?.suburb,
    city: payload.address?.city ?? payload.address?.town,
    ward: payload.address?.city_district,
    source: "Nominatim",
  };
}
