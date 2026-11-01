import { useState } from "react";
import { calculateTrustScore } from "@/lib/reporting/antiFraudEngine";

export function RapidReportWorkflow({ onSubmit }: { onSubmit: (payload: { description: string; trustScore: number }) => void }) {
  const [description, setDescription] = useState("");
  const [gpsVerified, setGpsVerified] = useState(false);
  return (
    <section aria-label="Rapid flood report" className="rounded-2xl border-2 p-4">
      <h2 className="font-bold">Report street flooding</h2>
      <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the water depth and obstruction" className="mt-3 min-h-24 w-full rounded-lg border p-3" />
      <label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={gpsVerified} onChange={(event) => setGpsVerified(event.target.checked)} /> My GPS position matches this report</label>
      <button type="button" disabled={!description.trim()} onClick={() => onSubmit({ description: description.trim(), trustScore: calculateTrustScore({ deviceTenureDays: 0, distanceFromGpsMeters: gpsVerified ? 0 : 1000, confirmations: 0, roadClearVotes: 0 }) })} className="mt-3 min-h-11 w-full rounded-lg bg-red-600 px-4 font-bold text-white disabled:opacity-50">Submit report</button>
    </section>
  );
}
