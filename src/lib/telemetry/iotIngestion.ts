import { parseSensorTelemetry, type SensorTelemetryPacket } from "./sensorProtocols";

export interface TelemetryAlarm {
  sensorId: string;
  severity: "Warning" | "Critical";
  reason: string;
  createdAt: string;
}

export function ingestTelemetryPacket(input: unknown) {
  const packet = parseSensorTelemetry(input);
  const alarms: TelemetryAlarm[] = [];
  if (packet.rateOfRiseMmMin > 20) alarms.push({ sensorId: packet.sensorId, severity: "Critical", reason: "Water is rising faster than 2 cm/min.", createdAt: new Date().toISOString() });
  else if (packet.rateOfRiseMmMin > 10) alarms.push({ sensorId: packet.sensorId, severity: "Warning", reason: "Rapid water-level rise detected.", createdAt: new Date().toISOString() });
  if (packet.tamperAlert) alarms.push({ sensorId: packet.sensorId, severity: "Warning", reason: "Sensor tamper alert reported.", createdAt: new Date().toISOString() });
  return { packet, alarms };
}

export function createTelemetryBatch(inputs: unknown[]): { packets: SensorTelemetryPacket[]; alarms: TelemetryAlarm[] } {
  const packets: SensorTelemetryPacket[] = [];
  const alarms: TelemetryAlarm[] = [];
  for (const input of inputs) {
    const result = ingestTelemetryPacket(input);
    packets.push(result.packet);
    alarms.push(...result.alarms);
  }
  return { packets, alarms };
}
