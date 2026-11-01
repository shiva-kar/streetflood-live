import type { EvacuationMode, RoadRouteStep } from "./types";
import type { Language } from "@/lib/i18n";

const LOCALE: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

export function speakAlert(text: string, lang: Language = "en") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LOCALE[lang];
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export function speakTurnInstruction(step: RoadRouteStep, lang: Language = "en") {
  speakAlert(`${step.instruction} onto ${step.streetName}. In ${Math.round(step.distanceMeters)} metres.`, lang);
}

export function cancelVoiceAnnouncements() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

export type { EvacuationMode };
