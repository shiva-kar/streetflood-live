/**
 * Community data layer.
 * - If VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY are set at build time, data is shared
 *   through the user's own free Supabase project (accounts, roles, photos, live updates).
 * - Otherwise reports are kept on this device only, so the app still works for free with no setup.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { canSendReport, findDuplicate, type Depth, type ReportStatus, type ScoredReport } from "./scoring";

export interface Report extends ScoredReport {
  note: string;
  photoUrl: string | null;
  userId: string | null;
}
export interface Closure {
  id: string;
  lat: number;
  lng: number;
  note: string;
  createdAt: string;
}
export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger";
  lat: number;
  lng: number;
  radiusKm: number;
  createdAt: string;
  expiresAt: string;
}
export interface Snapshot {
  reports: Report[];
  closures: Closure[];
  alerts: Alert[];
}
export interface Bbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

const env = import.meta.env as Record<string, string | undefined>;
const URL_ = env["VITE_SUPABASE_URL"];
const KEY = env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? env["VITE_SUPABASE_ANON_KEY"];
export const isShared = Boolean(URL_ && KEY);

let client: SupabaseClient | null = null;
async function sb(): Promise<SupabaseClient> {
  if (!client) {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(URL_!, KEY!, { auth: { persistSession: true, detectSessionInUrl: true } });
  }
  return client;
}

// ---------------- Local (this device) ----------------
const LKEY = "streetflood:live:v2";
function loadLocal(): Snapshot & { mine: string[] } {
  try {
    const raw = localStorage.getItem(LKEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { reports: [], closures: [], alerts: [], mine: [] };
}
function saveLocal(s: Snapshot & { mine: string[] }) {
  const cutoff = Date.now() - 24 * 3600_000;
  s.reports = s.reports.filter((r) => Date.parse(r.createdAt) > cutoff);
  try {
    localStorage.setItem(LKEY, JSON.stringify(s));
  } catch {
    // photos may overflow storage — drop photos and retry
    s.reports = s.reports.map((r) => ({ ...r, photoUrl: null }));
    localStorage.setItem(LKEY, JSON.stringify(s));
  }
  localListeners.forEach((l) => l());
}
const localListeners = new Set<() => void>();

const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const inBox = (b: Bbox) => (p: { lat: number; lng: number }) =>
  p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east;

// ---------------- Mapping ----------------
type Row = Record<string, unknown>;
const toReport = (r: Row): Report => ({
  id: String(r["id"]),
  lat: Number(r["lat"]),
  lng: Number(r["lng"]),
  depth: r["depth"] as Depth,
  status: r["status"] as ReportStatus,
  createdAt: String(r["created_at"]),
  confirms: Number(r["confirms"] ?? 0),
  clears: Number(r["clears"] ?? 0),
  note: String(r["note"] ?? ""),
  photoUrl: (r["photo_url"] as string | null) ?? null,
  userId: (r["user_id"] as string | null) ?? null,
});
const toClosure = (r: Row): Closure => ({
  id: String(r["id"]),
  lat: Number(r["lat"]),
  lng: Number(r["lng"]),
  note: String(r["note"] ?? ""),
  createdAt: String(r["created_at"]),
});
const toAlert = (r: Row): Alert => ({
  id: String(r["id"]),
  title: String(r["title"]),
  message: String(r["message"]),
  severity: r["severity"] as Alert["severity"],
  lat: Number(r["lat"]),
  lng: Number(r["lng"]),
  radiusKm: Number(r["radius_km"]),
  createdAt: String(r["created_at"]),
  expiresAt: String(r["expires_at"]),
});

// ---------------- Public API ----------------
export async function loadArea(b: Bbox): Promise<Snapshot> {
  if (!isShared) {
    const s = loadLocal();
    const now = Date.now();
    return {
      reports: s.reports.filter(inBox(b)),
      closures: s.closures.filter(inBox(b)),
      alerts: s.alerts.filter((a) => Date.parse(a.expiresAt) > now),
    };
  }
  const c = await sb();
  const since = new Date(Date.now() - 6 * 3600_000).toISOString();
  const nowIso = new Date().toISOString();
  const [r, cl, al] = await Promise.all([
    c.from("reports").select("*").gte("created_at", since).gte("lat", b.south).lte("lat", b.north).gte("lng", b.west).lte("lng", b.east).limit(1000),
    c.from("closures").select("*").eq("active", true).gte("lat", b.south).lte("lat", b.north).gte("lng", b.west).lte("lng", b.east),
    c.from("alerts").select("*").gt("expires_at", nowIso).order("created_at", { ascending: false }).limit(50),
  ]);
  if (r.error) throw r.error;
  return {
    reports: (r.data ?? []).map(toReport),
    closures: (cl.data ?? []).map(toClosure),
    alerts: (al.data ?? []).map(toAlert),
  };
}

/** Calls `onChange` whenever community data changes. Returns unsubscribe. */
export function subscribe(onChange: () => void): () => void {
  if (!isShared) {
    localListeners.add(onChange);
    const onStorage = (e: StorageEvent) => e.key === LKEY && onChange();
    window.addEventListener("storage", onStorage);
    return () => {
      localListeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  }
  let stop = () => {};
  void sb().then((c) => {
    const ch = c
      .channel("live")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "closures" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, onChange)
      .subscribe();
    stop = () => void c.removeChannel(ch);
  });
  return () => stop();
}

export interface NewReport {
  lat: number;
  lng: number;
  depth: Depth;
  note: string;
  photo: Blob | null;
}

export async function submitReport(n: NewReport): Promise<{ merged: boolean }> {
  const now = Date.now();
  if (!isShared) {
    const s = loadLocal();
    if (!canSendReport(s.mine, now)) throw new Error("You've sent 5 reports in the last hour. Please wait a bit.");
    const dup = findDuplicate(s.reports, n.lat, n.lng, now);
    if (dup) {
      dup.confirms++;
      s.mine.push(new Date(now).toISOString());
      saveLocal(s);
      return { merged: true };
    }
    const photoUrl = n.photo ? await blobToDataUrl(n.photo) : null;
    s.reports.push({
      id: id(),
      lat: n.lat,
      lng: n.lng,
      depth: n.depth,
      note: n.note.slice(0, 280),
      status: "pending",
      createdAt: new Date(now).toISOString(),
      confirms: 0,
      clears: 0,
      photoUrl,
      userId: null,
    });
    s.mine = [...s.mine.filter((t) => now - Date.parse(t) < 3600_000), new Date(now).toISOString()];
    saveLocal(s);
    return { merged: false };
  }
  const c = await sb();
  const { data: u } = await c.auth.getUser();
  if (!u.user) throw new Error("Please sign in to send a report.");
  let photo_url: string | null = null;
  if (n.photo) {
    const path = `${u.user.id}/${id()}.jpg`;
    const up = await c.storage.from("report-photos").upload(path, n.photo, { contentType: "image/jpeg" });
    if (up.error) throw new Error("Photo upload failed. Try again without a photo.");
    photo_url = c.storage.from("report-photos").getPublicUrl(path).data.publicUrl;
  }
  const { data, error } = await c.rpc("submit_report", {
    _lat: n.lat,
    _lng: n.lng,
    _depth: n.depth,
    _note: n.note.slice(0, 280),
    _photo_url: photo_url,
  });
  if (error) throw new Error(error.message);
  return { merged: data === "merged" };
}

export async function vote(reportId: string, kind: "confirm" | "clear") {
  if (!isShared) {
    const s = loadLocal();
    const r = s.reports.find((x) => x.id === reportId);
    if (r) {
      if (kind === "confirm") {
        r.confirms++;
      } else {
        r.clears++;
      }
    }
    saveLocal(s);
    return;
  }
  const c = await sb();
  const { data: u } = await c.auth.getUser();
  if (!u.user) throw new Error("Please sign in to vote.");
  const { error } = await c.from("report_votes").upsert({ report_id: reportId, user_id: u.user.id, kind });
  if (error) throw new Error(error.message);
}

// ---------------- Moderator actions ----------------
export async function moderate(reportId: string, status: "verified" | "dismissed") {
  if (!isShared) {
    const s = loadLocal();
    const r = s.reports.find((x) => x.id === reportId);
    if (r) r.status = status;
    saveLocal(s);
    return;
  }
  const c = await sb();
  const { error } = await c.from("reports").update({ status }).eq("id", reportId);
  if (error) throw new Error(error.message);
}

export async function addClosure(lat: number, lng: number, note: string) {
  if (!isShared) {
    const s = loadLocal();
    s.closures.push({ id: id(), lat, lng, note, createdAt: new Date().toISOString() });
    saveLocal(s);
    return;
  }
  const c = await sb();
  const { error } = await c.from("closures").insert({ lat, lng, note });
  if (error) throw new Error(error.message);
}

export async function removeClosure(closureId: string) {
  if (!isShared) {
    const s = loadLocal();
    s.closures = s.closures.filter((x) => x.id !== closureId);
    saveLocal(s);
    return;
  }
  const c = await sb();
  const { error } = await c.from("closures").update({ active: false }).eq("id", closureId);
  if (error) throw new Error(error.message);
}

export async function publishAlert(a: Omit<Alert, "id" | "createdAt" | "expiresAt">, hours: number) {
  const expiresAt = new Date(Date.now() + hours * 3600_000).toISOString();
  if (!isShared) {
    const s = loadLocal();
    s.alerts.unshift({ ...a, id: id(), createdAt: new Date().toISOString(), expiresAt });
    saveLocal(s);
    return;
  }
  const c = await sb();
  const { error } = await c.from("alerts").insert({
    title: a.title,
    message: a.message,
    severity: a.severity,
    lat: a.lat,
    lng: a.lng,
    radius_km: a.radiusKm,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
}

// ---------------- Accounts ----------------
export interface Me {
  email: string;
  isModerator: boolean;
}

export async function getMe(): Promise<Me | null> {
  if (!isShared) return { email: "this device", isModerator: true };
  const c = await sb();
  const { data } = await c.auth.getUser();
  if (!data.user) return null;
  const { data: mod } = await c.rpc("is_moderator", { _user_id: data.user.id });
  return { email: data.user.email ?? "", isModerator: Boolean(mod) };
}

export function onAuthChange(cb: () => void): () => void {
  if (!isShared) return () => {};
  let off = () => {};
  void sb().then((c) => {
    const { data } = c.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT" || e === "USER_UPDATED") cb();
    });
    off = () => data.subscription.unsubscribe();
  });
  return () => off();
}

export async function sendMagicLink(email: string) {
  const c = await sb();
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw new Error(error.message);
}

export async function signInWithGoogle() {
  const c = await sb();
  const { error } = await c.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  if (!isShared) return;
  const c = await sb();
  await c.auth.signOut();
}

// ---------------- Helpers ----------------
function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Could not read photo"));
    r.readAsDataURL(b);
  });
}

/** Shrink a photo to a small JPEG so uploads stay inside free storage limits. */
export function compressPhoto(file: File, max = 960): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose a photo."));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onerror = () => reject(new Error("This photo format isn't supported."));
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext("2d")?.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process photo"))), "image/jpeg", 0.72);
    };
    img.src = url;
  });
}
