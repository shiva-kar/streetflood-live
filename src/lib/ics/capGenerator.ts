export interface CapAlertInput {
  identifier: string;
  sender: string;
  headline: string;
  description: string;
  instruction: string;
  urgency: "Immediate" | "Expected" | "Future" | "Past";
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  certainty: "Observed" | "Likely" | "Possible" | "Unlikely" | "Unknown";
  polygon: Array<[number, number]>;
  sent?: Date;
  language?: string;
}

function xml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

export function generateCapXml(input: CapAlertInput) {
  const polygon = input.polygon.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(" ");
  const sent = (input.sent ?? new Date()).toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
<identifier>${xml(input.identifier)}</identifier><sender>${xml(input.sender)}</sender><sent>${sent}</sent>
<status>Actual</status><msgType>Alert</msgType><scope>Public</scope>
<info><language>${xml(input.language ?? "en-IN")}</language><category>Met</category><event>Flood Warning</event>
<eventCode><valueName>profile:OASIS-TEC</valueName><value>FLW</value></eventCode>
<urgency>${input.urgency}</urgency><severity>${input.severity}</severity><certainty>${input.certainty}</certainty>
<headline>${xml(input.headline)}</headline><description>${xml(input.description)}</description><instruction>${xml(input.instruction)}</instruction>
<area><areaDesc>Mumbai municipal flood response area</areaDesc><polygon>${polygon}</polygon></area>
</info></alert>`;
}
