import {
  clearQueuedReport,
  getQueuedOfflineReports,
  queueOfflineReport,
  submitLiveReport,
  type QueuedOfflineReport,
} from "@/lib/supabase/client";

export { clearQueuedReport, getQueuedOfflineReports, queueOfflineReport };

export async function flushOfflineReports(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const queued = await getQueuedOfflineReports();
  let flushed = 0;
  for (const report of queued) {
    try {
      await submitLiveReport({
        lat: report.lat,
        lng: report.lng,
        waterDepth: report.waterDepth,
        description: report.description,
        photoDataUrl: report.photoUrl,
      });
      await clearQueuedReport(report.id);
      flushed += 1;
    } catch {
      break;
    }
  }
  return flushed;
}

export type OfflineReportPayload = QueuedOfflineReport;
