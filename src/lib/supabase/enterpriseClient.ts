import { getSupabase } from "./client";

export async function insertOfflineSyncJournal(entry: {
  clientUuid: string;
  entity: string;
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
}) {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.from("offline_sync_journal").insert({
    client_uuid: entry.clientUuid,
    entity: entry.entity,
    operation: entry.operation,
    payload: entry.payload,
  }).select().single();
  if (error) throw new Error(`Offline sync journal insert failed: ${error.message}`);
  return data;
}

export async function fetchNearbyEnterpriseShelters(lat: number, lng: number, radiusMeters = 5000) {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.rpc("nearby_enterprise_shelters", {
    latitude: lat,
    longitude: lng,
    radius_meters: radiusMeters,
  });
  if (error) throw new Error(`Enterprise shelter query failed: ${error.message}`);
  return data ?? [];
}
