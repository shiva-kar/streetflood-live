import { useSyncExternalStore } from "react";
import { seedState } from "./data";
import type { AppState } from "./types";

const KEY = "streetflood:v2";
const ALIAS_KEY = "streetflood_state_v2";
let state: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  try {
    const raw = window.localStorage.getItem(KEY) || window.localStorage.getItem(ALIAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 2) return parsed;
    }
  } catch {
    /* corrupted storage falls back to seed */
  }
  return seedState(Date.now());
}

let persistTimeout: ReturnType<typeof setTimeout> | null = null;

function saveToLocalStorage(appState: AppState) {
  try {
    const serialized = JSON.stringify(appState);
    window.localStorage.setItem(KEY, serialized);
    window.localStorage.setItem(ALIAS_KEY, serialized);
  } catch {
    // If QuotaExceededError, attempt saving without large photo data URLs
    try {
      const strippedState: AppState = {
        ...appState,
        reports: appState.reports.map((r) => {
          if (r.photoUrl && r.photoUrl.length > 5000) {
            return { ...r, photoUrl: undefined };
          }
          return r;
        }),
      };
      const compactSerialized = JSON.stringify(strippedState);
      window.localStorage.setItem(KEY, compactSerialized);
      window.localStorage.setItem(ALIAS_KEY, compactSerialized);
      console.warn("StreetFlood: Persisted state with pruned photos due to storage quota");
    } catch {
      console.warn("StreetFlood: Could not persist state to localStorage (storage full)");
    }
  }
}

function persist(immediate = false) {
  if (typeof window === "undefined") return;
  if (immediate) {
    if (persistTimeout) clearTimeout(persistTimeout);
    if (state) saveToLocalStorage(state);
    return;
  }
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    if (state) saveToLocalStorage(state);
  }, 100);
}

export function getState(): AppState {
  if (!state) state = load();
  return state;
}

export function setState(fn: (s: AppState) => AppState) {
  state = fn(getState());
  persist();
  listeners.forEach((l) => l());
}

export function resetScenario() {
  state = seedState(Date.now());
  persist(true);
  listeners.forEach((l) => l());
}

export const resetDemo = resetScenario;

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Returns null during SSR / before hydration. */
export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, getState, () => null);
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(performance.now() * 1000).toString(36)}`;
}

/** Downscale an image file to a compact JPEG data URL so it fits in localStorage. */
export function fileToCompactDataUrl(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the photo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("This image format is not supported."));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
