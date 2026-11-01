export type SensorHardwareModel = "HC-SR04-CIVIC" | "VALKYRIE-RADAR-V2" | "OTT-PLUVIO";
export type SensorInstallationType = "curb_depth" | "storm_drain_manhole" | "river_gauge" | "tipping_bucket";

export interface SensorTelemetryPacket {
  sensorId: string;
  hardwareModel: SensorHardwareModel;
  lat: number;
  lng: number;
  installationType: SensorInstallationType;
  waterDepthCm: number;
  rateOfRiseMmMin: number;
  batteryMilliVolts: number;
  signalRssi: number;
  timestamp: string;
  tamperAlert: boolean;
}

export type SensorTransport = "mqtt" | "coap" | "http";

export function parseTransportPayload(input: unknown, transport: SensorTransport): SensorTelemetryPacket {
  if (transport === "http") return parseSensorTelemetry(input);
  if (!input || typeof input !== "object") throw new Error(`${transport.toUpperCase()} telemetry payload must be an object.`);
  const envelope = input as { payload?: unknown; data?: unknown };
  return parseSensorTelemetry(envelope.payload ?? envelope.data ?? input);
}

export function parseSensorTelemetry(input: unknown): SensorTelemetryPacket {
  if (!input || typeof input !== "object") throw new Error("Telemetry packet must be an object.");
  const packet = input as Record<string, unknown>;
  const required = ["sensorId", "hardwareModel", "lat", "lng", "installationType", "waterDepthCm", "rateOfRiseMmMin", "batteryMilliVolts", "signalRssi", "timestamp", "tamperAlert"];
  if (required.some((key) => packet[key] === undefined)) throw new Error("Telemetry packet is missing required fields.");
  if (typeof packet.sensorId !== "string" || !Number.isFinite(packet.lat as number) || !Number.isFinite(packet.lng as number)) {
    throw new Error("Telemetry identity or coordinates are invalid.");
  }
  if (Number(packet.waterDepthCm) < 0 || Number(packet.batteryMilliVolts) < 0) throw new Error("Telemetry values cannot be negative.");
  return {
    sensorId: packet.sensorId,
    hardwareModel: packet.hardwareModel as SensorHardwareModel,
    lat: Number(packet.lat),
    lng: Number(packet.lng),
    installationType: packet.installationType as SensorInstallationType,
    waterDepthCm: Number(packet.waterDepthCm),
    rateOfRiseMmMin: Number(packet.rateOfRiseMmMin),
    batteryMilliVolts: Number(packet.batteryMilliVolts),
    signalRssi: Number(packet.signalRssi),
    timestamp: new Date(String(packet.timestamp)).toISOString(),
    tamperAlert: Boolean(packet.tamperAlert),
  };
}
