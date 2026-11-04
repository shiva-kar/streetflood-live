import type { RoadRouteStep } from "@/lib/flood/types";

export type GuidanceLanguage = "en-IN" | "kn-IN" | "hi-IN" | "mr-IN";

export function speakGuidance(text: string, language: GuidanceLanguage, volume = 1) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.volume = Math.max(0, Math.min(1, volume));
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function speakRouteStep(step: RoadRouteStep, language: GuidanceLanguage) {
  return speakGuidance(`${step.instruction} ${step.streetName}.`, language);
}

export function cancelGuidance() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
