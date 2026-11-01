import type { RoadRouteResult } from "@/lib/flood/types";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);
}

export function routeToGpx(route: RoadRouteResult, name = "StreetFlood evacuation route") {
  const points = route.coordinates.map(([lat, lng]) =>
    `<trkpt lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}"></trkpt>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StreetFlood Live" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escapeXml(name)}</name><desc>${escapeXml(route.safetyMessage)}</desc></metadata>
  <trk><name>${escapeXml(name)}</name><trkseg>${points}</trkseg></trk>
</gpx>`;
}

export function routeToKml(route: RoadRouteResult, name = "StreetFlood evacuation route") {
  const coordinates = route.coordinates.map(([lat, lng]) => `${lng.toFixed(7)},${lat.toFixed(7)},0`).join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${escapeXml(name)}</name>
<Placemark><name>${escapeXml(route.safetyStatus)}</name><LineString><tessellate>1</tessellate><coordinates>${coordinates}</coordinates></LineString></Placemark>
</Document></kml>`;
}
