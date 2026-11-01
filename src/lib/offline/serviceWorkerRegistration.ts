export async function registerStreetFloodServiceWorker(baseUrl = "/") {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register(`${baseUrl.replace(/\/?$/, "/")}sw.js`);
  try {
    await registration.sync?.register("streetflood-report-sync");
  } catch {
    // Background sync is optional; the application also flushes on online events.
  }
  return registration;
}

export function listenForOfflineFlush(handler: () => void) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => undefined;
  const listener = (event: MessageEvent) => {
    if (event.data?.type === "FLUSH_OFFLINE_REPORTS") handler();
  };
  navigator.serviceWorker.addEventListener("message", listener);
  return () => navigator.serviceWorker.removeEventListener("message", listener);
}
