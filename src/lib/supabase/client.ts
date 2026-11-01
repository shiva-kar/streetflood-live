import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { FloodAlert, FloodReport, RoadIncident, Shelter, WaterDepth } from "../flood/types";
import {
  assertPhotoWithinFreeQuota,
  assertZeroCostUrl,
  checkCitizenRateLimit,
  recordCitizenSubmission,
} from "../guards/zeroCostGuard";

// Check environment variables or user-configured browser keys
const ENV_URL = import.meta.env.VITE_SUPABASE_URL || "";
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const STORAGE_KEY_URL = "streetflood_supabase_url";
const STORAGE_KEY_ANON = "streetflood_supabase_anon_key";

export function getStoredSupabaseConfig() {
  if (typeof window === "undefined") return { url: ENV_URL, key: ENV_KEY };
  const customUrl = window.localStorage.getItem(STORAGE_KEY_URL);
  const customKey = window.localStorage.getItem(STORAGE_KEY_ANON);
  return {
    url: customUrl?.trim() || ENV_URL,
    key: customKey?.trim() || ENV_KEY,
  };
}

export function saveStoredSupabaseConfig(url: string, key: string) {
  if (typeof window === "undefined") return;
  if (url) window.localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else window.localStorage.removeItem(STORAGE_KEY_URL);

  if (key) window.localStorage.setItem(STORAGE_KEY_ANON, key.trim());
  else window.localStorage.removeItem(STORAGE_KEY_ANON);

  // Re-instantiate client
  clientInstance = null;
}

let clientInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const { url, key } = getStoredSupabaseConfig();
  return Boolean(url && key && url.startsWith("https://") && key.length > 20);
}

export function getSupabase(): SupabaseClient | null {
  if (clientInstance) return clientInstance;
  const { url, key } = getStoredSupabaseConfig();
  if (!url || !key || !url.startsWith("https://")) {
    return null;
  }

  try {
    // Structural zero-cost assert: ensure URL is an authentic Supabase free-tier project
    assertZeroCostUrl(url);

    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return clientInstance;
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
    return null;
  }

}

export async function uploadFloodPhoto(fileBlob: Blob, reportId: string): Promise<string | null> {
  const dataUrl = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(fileBlob);
  });
  const sb = getSupabase();
  if (!sb) return dataUrl;
  const path = `public/${reportId}.webp`;
  const { data, error } = await sb.storage.from("flood-photos").upload(path, fileBlob, {
    contentType: "image/webp",
    upsert: true,
  });
  if (error || !data) {
    console.warn("Flood photo upload failed; retaining offline data URL.", error?.message);
    return dataUrl;
  }
  return sb.storage.from("flood-photos").getPublicUrl(data.path).data.publicUrl;
}

// ---------------------------------------------------------------------------
// AUTHENTICATION HELPERS
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: "citizen" | "moderator" | "authority" | "admin";
}

export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email || "",
    fullName: data.full_name || "",
    role: data.role || "citizen",
  };
}

export async function signInWithMagicLink(email: string, redirectTo?: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured.");
  const redirect = redirectTo || (typeof window !== "undefined" ? window.location.origin : "");
  return sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect },
  });
}

export async function signInWithGoogle(redirectTo?: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured.");
  const redirect = redirectTo || (typeof window !== "undefined" ? window.location.origin : "");
  return sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirect },
  });
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  return sb.auth.signOut();
}

// ---------------------------------------------------------------------------
// OFFLINE QUEUE (IndexedDB)
// ---------------------------------------------------------------------------

const DB_NAME = "streetflood_local_db";
const STORE_NAME = "queued_reports";

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface QueuedOfflineReport {
  id: string;
  lat: number;
  lng: number;
  waterDepth: WaterDepth;
  description: string;
  photoUrl?: string;
  createdAt: string;
}

export async function queueOfflineReport(report: QueuedOfflineReport): Promise<void> {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(report);
  } catch (e) {
    console.warn("Could not queue report in IndexedDB, fallback to localStorage:", e);
    const existing = JSON.parse(window.localStorage.getItem("queued_reports") || "[]");
    existing.push(report);
    window.localStorage.setItem("queued_reports", JSON.stringify(existing));
  }
}

export async function getQueuedOfflineReports(): Promise<QueuedOfflineReport[]> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return JSON.parse(window.localStorage.getItem("queued_reports") || "[]");
  }
}

export async function clearQueuedReport(id: string): Promise<void> {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
  } catch {
    const existing: QueuedOfflineReport[] = JSON.parse(
      window.localStorage.getItem("queued_reports") || "[]",
    );
    window.localStorage.setItem(
      "queued_reports",
      JSON.stringify(existing.filter((r) => r.id !== id)),
    );
  }
}

// ---------------------------------------------------------------------------
// DATA API (Reports, Incidents, Alerts, Shelters)
// ---------------------------------------------------------------------------

export async function fetchLiveReports(bbox?: {
  south: number;
  west: number;
  north: number;
  east: number;
}): Promise<FloodReport[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb
    .from("flood_reports")
    .select("*")
    .neq("status", "Dismissed")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (bbox) {
    query = query
      .gte("lat", bbox.south)
      .lte("lat", bbox.north)
      .gte("lng", bbox.west)
      .lte("lng", bbox.east);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    tileId: `t_${Math.floor(r.lat / 0.001)}_${Math.floor(r.lng / 0.001)}`,
    lat: r.lat,
    lng: r.lng,
    description: r.description || "",
    severityUser: r.water_depth as WaterDepth,
    photoUrl: r.photo_url || undefined,
    createdAt: r.created_at,
    status: r.status,
    confirmVotes: r.confirm_votes || 0,
    clearedVotes: r.cleared_votes || 0,
  }));
}

export async function submitLiveReport(report: {
  lat: number;
  lng: number;
  waterDepth: WaterDepth;
  description: string;
  photoDataUrl?: string;
}): Promise<FloodReport | null> {
  // 1. Zero-cost rate limit guard
  const rate = checkCitizenRateLimit();
  if (!rate.allowed) {
    throw new Error(
      `Rate limit exceeded: max 5 reports per hour to protect free civic infrastructure. Please wait ${rate.resetMinutes} minutes.`,
    );
  }

  // 2. Storage quota guard (limit compressed photo bytes)
  if (report.photoDataUrl) {
    assertPhotoWithinFreeQuota(report.photoDataUrl);
  }

  const sb = getSupabase();
  let uploadedPhotoUrl = report.photoDataUrl;

  // If Supabase storage is configured and photo is data URL, upload as compressed image
  if (sb && report.photoDataUrl && report.photoDataUrl.startsWith("data:image/")) {
    try {
      const res = await fetch(report.photoDataUrl);
      const blob = await res.blob();
      uploadedPhotoUrl =
        (await uploadFloodPhoto(blob, `report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)) ||
        uploadedPhotoUrl;
    } catch (e) {
      console.warn("Storage upload failed, keeping inline/data URL:", e);
    }
  }

  if (!sb) {
    // Local / Offline mode: queue in IndexedDB
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const offlineRep: QueuedOfflineReport = {
      id: localId,
      lat: report.lat,
      lng: report.lng,
      waterDepth: report.waterDepth,
      description: report.description,
      photoUrl: uploadedPhotoUrl,
      createdAt: new Date().toISOString(),
    };
    await queueOfflineReport(offlineRep);
    recordCitizenSubmission();
    return {
      id: localId,
      tileId: `t_${Math.floor(report.lat / 0.001)}_${Math.floor(report.lng / 0.001)}`,
      lat: report.lat,
      lng: report.lng,
      description: report.description,
      severityUser: report.waterDepth,
      photoUrl: uploadedPhotoUrl,
      createdAt: offlineRep.createdAt,
      status: "Unverified",
    };
  }

  const user = await getCurrentUser();
  const { data, error } = await sb
    .from("flood_reports")
    .insert({
      user_id: user?.id || null,
      lat: report.lat,
      lng: report.lng,
      water_depth: report.waterDepth,
      description: report.description,
      photo_url: uploadedPhotoUrl,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to submit report");
  }

  recordCitizenSubmission();

  return {
    id: data.id,
    tileId: `t_${Math.floor(data.lat / 0.001)}_${Math.floor(data.lng / 0.001)}`,
    lat: data.lat,
    lng: data.lng,
    description: data.description,
    severityUser: data.water_depth,
    photoUrl: data.photo_url,
    createdAt: data.created_at,
    status: data.status,
  };
}

export async function voteLiveReport(reportId: string, voteType: "confirm" | "cleared") {
  const sb = getSupabase();
  if (!sb) return;
  const user = await getCurrentUser();
  if (!user) throw new Error("Please sign in to confirm or clear reports.");

  const { error } = await sb.from("report_votes").upsert(
    {
      report_id: reportId,
      user_id: user.id,
      vote: voteType,
    },
    { onConflict: "report_id,user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function fetchLiveIncidents(): Promise<RoadIncident[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("road_incidents")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((inc) => ({
    id: inc.id,
    tileId: `t_${Math.floor(inc.lat / 0.001)}_${Math.floor(inc.lng / 0.001)}`,
    status: inc.status,
    description: inc.description || inc.road_name,
    createdAt: inc.created_at,
    updatedAt: inc.updated_at,
    createdBy: "Authority" as const,
  }));
}

export async function createLiveIncident(incident: {
  roadName: string;
  status: "PartiallyFlooded" | "ClosedSmallVehicles" | "ClosedAllTraffic";
  description: string;
  lat: number;
  lng: number;
  geometry?: [number, number][];
}) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured.");
  const user = await getCurrentUser();
  const { data, error } = await sb
    .from("road_incidents")
    .insert({
      road_name: incident.roadName,
      status: incident.status,
      description: incident.description,
      lat: incident.lat,
      lng: incident.lng,
      geometry: incident.geometry || [],
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchLiveAlerts(): Promise<FloodAlert[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("flood_alerts")
    .select("*")
    .eq("status", "Published")
    .gt("expires_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error || !data) return [];

  return data.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    severity: a.severity,
    type: "Municipal" as const,
    status: a.status,
    tileIds: [],
    wardLabel: a.area_label,
    createdAt: a.created_at,
    publishedAt: a.published_at,
  }));
}

export async function createLiveAlert(alert: {
  title: string;
  message: string;
  severity: "Info" | "Warning" | "Critical";
  areaLabel?: string;
  polygonCoords?: [number, number][];
}) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured.");
  const user = await getCurrentUser();
  const { data, error } = await sb
    .from("flood_alerts")
    .insert({
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      area_label: alert.areaLabel,
      polygon_coords: alert.polygonCoords || [],
      created_by: user?.id,
      published_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
