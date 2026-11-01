const TILE_CACHE = "streetflood-osm-v1";
const WEATHER_CACHE = "streetflood-weather-v1";
const MAX_TILES = 500;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isTile = url.hostname.endsWith("tile.openstreetmap.org");
  const isWeather = url.hostname === "api.open-meteo.com";
  if (!isTile && !isWeather) return;

  event.respondWith(
    caches.open(isTile ? TILE_CACHE : WEATHER_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (isTile && cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          await cache.put(event.request, response.clone());
          if (isTile) {
            const keys = await cache.keys();
            if (keys.length > MAX_TILES) await cache.delete(keys[0]);
          }
        }
        return response;
      } catch {
        return cached || Response.error();
      }
    }),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "streetflood-report-sync") {
    event.waitUntil(self.clients.matchAll().then((clients) => clients.forEach((client) => client.postMessage({ type: "FLUSH_OFFLINE_REPORTS" }))));
  }
});
