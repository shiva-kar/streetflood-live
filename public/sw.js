const TILE_CACHE = "streetflood-osm-v1";
const WEATHER_CACHE = "streetflood-weather-v1";
const MAX_TILES = 500;
const TILE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const WEATHER_MAX_AGE = 5 * 60 * 1000;

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
      const maxAge = isTile ? TILE_MAX_AGE : WEATHER_MAX_AGE;
      if (cached) {
        const cachedAt = Number(cached.headers.get("x-streetflood-cached-at") || 0);
        if (cachedAt && Date.now() - cachedAt < maxAge && isTile) return cached;
        if (cachedAt && Date.now() - cachedAt < maxAge && isWeather) {
          event.waitUntil(fetch(event.request).then(async (response) => {
            if (response.ok) await cache.put(event.request, withCacheTimestamp(response));
          }).catch(() => undefined));
          return cached;
        }
      }
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          await cache.put(event.request, withCacheTimestamp(response));
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

function withCacheTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set("x-streetflood-cached-at", String(Date.now()));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener("sync", (event) => {
  if (event.tag === "streetflood-report-sync") {
    event.waitUntil(self.clients.matchAll().then((clients) => clients.forEach((client) => client.postMessage({ type: "FLUSH_OFFLINE_REPORTS" }))));
  }
});
