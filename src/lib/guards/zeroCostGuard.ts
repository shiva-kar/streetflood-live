/**
 * StreetFlood Live — Zero-Cost Structural Guard
 * 
 * Strict architectural safeguards ensuring the application operates
 * entirely within permanent $0 free tiers, with zero paid servers,
 * zero paid APIs, and zero payment processors.
 */

// Permitted Free Infrastructure Endpoints
export const PERMITTED_ZERO_COST_DOMAINS = [
  "openstreetmap.org",
  "tile.openstreetmap.org",
  "nominatim.openstreetmap.org",
  "api.open-meteo.com",
  "overpass-api.de",
  "maps.mail.ru",
  "project-osrm.org",
  "routing.openstreetmap.de",
  "supabase.co",
  "localhost",
  "127.0.0.1",
] as const;

// Prohibited Paid / Monetized Services
export const PROHIBITED_PAID_DOMAINS = [
  "maps.googleapis.com",
  "api.mapbox.com",
  "api.maptiler.com",
  "locationiq.com",
  "api.stripe.com",
  "checkout.stripe.com",
  "api.twilio.com",
  "onesignal.com",
  "firebaseio.com",
  "amazonaws.com",
] as const;

export class ZeroCostViolationError extends Error {
  constructor(message: string) {
    super(`[ZeroCostGuard Violation]: ${message}`);
    this.name = "ZeroCostViolationError";
  }
}

/**
 * Validates any outbound network URL against the strict zero-cost whitelist.
 * Throws ZeroCostViolationError if a paid or unauthorized service is detected.
 */
export function assertZeroCostUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Check prohibited paid services
    for (const prohibited of PROHIBITED_PAID_DOMAINS) {
      if (hostname === prohibited || hostname.endsWith(`.${prohibited}`)) {
        throw new ZeroCostViolationError(
          `Outbound request to paid/monetized provider '${hostname}' is strictly blocked. Only free civic infrastructure is permitted.`,
        );
      }
    }

    // Check permitted free domains
    const isPermitted = PERMITTED_ZERO_COST_DOMAINS.some(
      (permitted) => hostname === permitted || hostname.endsWith(`.${permitted}`),
    );

    if (!isPermitted) {
      throw new ZeroCostViolationError(
        `Host '${hostname}' is not in the verified zero-cost whitelist. Request aborted to prevent unexpected charges.`,
      );
    }

    return true;
  } catch (err: unknown) {
    if (err instanceof ZeroCostViolationError) throw err;
    throw new ZeroCostViolationError(`Invalid URL string provided: ${urlString}`);
  }
}

// ---------------------------------------------------------------------------
// STORAGE QUOTA GUARDS (Supabase Free Tier: 1 GB Max)
// ---------------------------------------------------------------------------

export const MAX_PHOTO_BYTES = 350 * 1024; // 350 KB hard limit per report photo
export const MAX_DESCRIPTION_LENGTH = 300; // 300 characters max

/**
 * Enforces client-side photo size compression guarantees.
 * Prevents storage exhaustion on free-tier buckets.
 */
export function assertPhotoWithinFreeQuota(dataUrlOrBytes: string | number): boolean {
  const byteSize =
    typeof dataUrlOrBytes === "number"
      ? dataUrlOrBytes
      : Math.round((dataUrlOrBytes.length * 3) / 4);

  if (byteSize > MAX_PHOTO_BYTES) {
    throw new ZeroCostViolationError(
      `Photo size (${Math.round(byteSize / 1024)} KB) exceeds the free civic tier limit of ${Math.round(
        MAX_PHOTO_BYTES / 1024,
      )} KB. Please compress the image.`,
    );
  }

  return true;
}

// ---------------------------------------------------------------------------
// REPORT RATE LIMIT GUARD (Max 5 reports per hour per citizen)
// ---------------------------------------------------------------------------

const LOCAL_REPORT_TIMESTAMPS_KEY = "streetflood_submission_timestamps";
export const MAX_REPORTS_PER_HOUR = 5;

export function checkCitizenRateLimit(): { allowed: boolean; remaining: number; resetMinutes: number } {
  if (typeof window === "undefined" || !window.localStorage) {
    return { allowed: true, remaining: MAX_REPORTS_PER_HOUR, resetMinutes: 0 };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_REPORT_TIMESTAMPS_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // Filter to last hour only
    const recent = timestamps.filter((t) => t > oneHourAgo);
    window.localStorage.setItem(LOCAL_REPORT_TIMESTAMPS_KEY, JSON.stringify(recent));

    if (recent.length >= MAX_REPORTS_PER_HOUR) {
      const oldestInWindow = Math.min(...recent);
      const resetMinutes = Math.max(1, Math.ceil((oldestInWindow + 60 * 60 * 1000 - Date.now()) / 60000));
      return { allowed: false, remaining: 0, resetMinutes };
    }

    return {
      allowed: true,
      remaining: MAX_REPORTS_PER_HOUR - recent.length,
      resetMinutes: 0,
    };
  } catch {
    return { allowed: true, remaining: MAX_REPORTS_PER_HOUR, resetMinutes: 0 };
  }
}

export function recordCitizenSubmission(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(LOCAL_REPORT_TIMESTAMPS_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps.push(Date.now());
    window.localStorage.setItem(LOCAL_REPORT_TIMESTAMPS_KEY, JSON.stringify(timestamps));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// ZERO COST SYSTEM STATUS SUMMARY
// ---------------------------------------------------------------------------

export const ZERO_COST_ARCHITECTURE_SPEC = {
  hosting: "GitHub Pages (100% Free Static Hosting, Unlimited Bandwidth)",
  database: "Supabase Free Tier (500 MB DB, 1 GB Storage, 50k MAU, Free Auth)",
  geocoding: "OpenStreetMap Nominatim (Free, Fair-Use Cached)",
  weather: "Open-Meteo Weather & Elevation (Free, No API Key Required)",
  shelters: "OpenStreetMap Overpass API (Free Civic Open Data)",
  routing: "OSRM Public Road Engine (Free Open Source Routing Machine)",
  monthlyCostEstimate: "$0.00 / month",
  creditCardRequired: false,
} as const;
