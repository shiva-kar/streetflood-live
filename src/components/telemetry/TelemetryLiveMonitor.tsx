import type { SensorTelemetryPacket } from "@/lib/telemetry/sensorProtocols";

export function TelemetryLiveMonitor({ packets }: { packets: SensorTelemetryPacket[] }) {
  return (
    <section aria-label="Live sensor telemetry" className="rounded-2xl border-2 p-4">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Telemetry feed</h2><span className="text-xs text-muted-foreground">{packets.length} sensors</span></div>
      <div className="space-y-2">{packets.length === 0 ? <p className="text-sm text-muted-foreground">No telemetry packets received.</p> : packets.map((packet) => <div key={`${packet.sensorId}-${packet.timestamp}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"><span className="font-semibold">{packet.sensorId}</span><span>{packet.waterDepthCm.toFixed(1)} cm</span><span>{packet.rateOfRiseMmMin.toFixed(1)} mm/min</span><span className={packet.tamperAlert ? "font-bold text-red-600" : "text-emerald-600"}>{packet.tamperAlert ? "Tamper" : "Nominal"}</span></div>)}</div>
    </section>
  );
}
