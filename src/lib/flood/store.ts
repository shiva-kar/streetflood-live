import { useSyncExternalStore } from "react";
import { seedState } from "./data";
import type { AppState } from "./types";

const KEY = "streetflood:v1";
const ALIAS_KEY = "streetflood_state_v1";
let state: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  try {
    const raw = window.localStorage.getItem(KEY) || window.localStorage.getItem(ALIAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    /* corrupted storage falls back to seed */
  }
  return seedState(Date.now());
}

function persist() {
  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(KEY, serialized);
    window.localStorage.setItem(ALIAS_KEY, serialized);
  } catch {
    // Storage quota (large photos) – keep in memory, warn once.
    console.warn("StreetFlood: could not persist state (storage full)");
  }
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

export function resetDemo() {
  state = seedState(Date.now());
  persist();
  listeners.forEach((l) => l());
}

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
