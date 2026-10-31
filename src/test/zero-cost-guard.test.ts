import { describe, expect, it, beforeEach } from "vitest";
import {
  assertZeroCostUrl,
  assertPhotoWithinFreeQuota,
  checkCitizenRateLimit,
  recordCitizenSubmission,
  MAX_PHOTO_BYTES,
  MAX_REPORTS_PER_HOUR,
  ZeroCostViolationError,
} from "@/lib/guards/zeroCostGuard";

describe("Zero-Cost Architecture & Budget Protection Guards", () => {
  describe("Network URL Firewall", () => {
    it("allows verified zero-cost civic and open endpoints", () => {
      expect(assertZeroCostUrl("https://tile.openstreetmap.org/15/123/456.png")).toBe(true);
      expect(assertZeroCostUrl("https://nominatim.openstreetmap.org/search?q=mumbai")).toBe(true);
      expect(assertZeroCostUrl("https://api.open-meteo.com/v1/forecast?latitude=19.0&longitude=72.8")).toBe(true);
      expect(assertZeroCostUrl("https://router.project-osrm.org/route/v1/driving/0,0;1,1")).toBe(true);
      expect(assertZeroCostUrl("https://overpass-api.de/api/interpreter")).toBe(true);
      expect(assertZeroCostUrl("https://my-civic-db.supabase.co/rest/v1/")).toBe(true);
    });

    it("strictly blocks paid mapping providers to prevent API billing", () => {
      expect(() =>
        assertZeroCostUrl("https://maps.googleapis.com/maps/api/js?key=AIzaSy..."),
      ).toThrowError(ZeroCostViolationError);

      expect(() =>
        assertZeroCostUrl("https://api.mapbox.com/geocoding/v5/mapbox.places/mumbai.json?access_token=pk..."),
      ).toThrowError(ZeroCostViolationError);

      expect(() =>
        assertZeroCostUrl("https://api.maptiler.com/maps/basic/style.json?key=..."),
      ).toThrowError(ZeroCostViolationError);
    });

    it("strictly blocks payment gateways and billing processors", () => {
      expect(() =>
        assertZeroCostUrl("https://api.stripe.com/v1/checkout/sessions"),
      ).toThrowError(ZeroCostViolationError);

      expect(() =>
        assertZeroCostUrl("https://checkout.stripe.com/pay/cs_live_..."),
      ).toThrowError(ZeroCostViolationError);

      expect(() =>
        assertZeroCostUrl("https://api.twilio.com/2010-04-01/Accounts/.../Messages.json"),
      ).toThrowError(ZeroCostViolationError);
    });

    it("rejects unauthorized external domains", () => {
      expect(() =>
        assertZeroCostUrl("https://random-paid-cloud-service.com/api"),
      ).toThrowError(ZeroCostViolationError);
    });
  });

  describe("Media Storage Quota Guard", () => {
    it("permits compressed photos under the free storage threshold", () => {
      // 100 KB payload
      expect(assertPhotoWithinFreeQuota(100 * 1024)).toBe(true);
      expect(assertPhotoWithinFreeQuota(MAX_PHOTO_BYTES - 1024)).toBe(true);
    });

    it("rejects oversized photos to protect the 1 GB Supabase free tier from exhaustion", () => {
      // 600 KB payload (over the 350 KB compressed limit)
      expect(() => assertPhotoWithinFreeQuota(600 * 1024)).toThrowError(ZeroCostViolationError);
    });
  });

  describe("Citizen Submission Rate Limiter", () => {
    let store: Record<string, string> = {};

    beforeEach(() => {
      store = {};
      const mockStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          store = {};
        },
      };

      if (typeof window === "undefined") {
        (globalThis as unknown as { window: { localStorage: typeof mockStorage } }).window = {
          localStorage: mockStorage,
        };
      } else {
        Object.defineProperty(window, "localStorage", {
          value: mockStorage,
          writable: true,
          configurable: true,
        });
      }
    });

    it("allows submissions within the fair-use limit of 5 per hour", () => {
      const initial = checkCitizenRateLimit();
      expect(initial.allowed).toBe(true);
      expect(initial.remaining).toBe(MAX_REPORTS_PER_HOUR);

      // Record 3 submissions
      recordCitizenSubmission();
      recordCitizenSubmission();
      recordCitizenSubmission();

      const after3 = checkCitizenRateLimit();
      expect(after3.allowed).toBe(true);
      expect(after3.remaining).toBe(2);
    });

    it("blocks submissions exceeding the hourly limit to prevent database exhaustion", () => {
      for (let i = 0; i < MAX_REPORTS_PER_HOUR; i++) {
        recordCitizenSubmission();
      }

      const blocked = checkCitizenRateLimit();
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetMinutes).toBeGreaterThan(0);
    });
  });
});
