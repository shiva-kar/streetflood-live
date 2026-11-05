import { describe, expect, it } from "vitest";
import { TRANSLATIONS } from "@/lib/i18n";

describe("Kannada (ಕನ್ನಡ) Localization for Bengaluru", () => {
  it("provides comprehensive translations for all required keys in kn", () => {
    const enKeys = Object.keys(TRANSLATIONS.en);
    const knTranslations = TRANSLATIONS.kn;

    expect(knTranslations).toBeDefined();

    for (const key of enKeys) {
      const val = (knTranslations as unknown as Record<string, string>)[key];
      expect(val).toBeDefined();
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
    }
  });

  it("contains authentic Kannada terminology for flood civic terms", () => {
    expect(TRANSLATIONS.kn.appName).toContain("ಸ್ಟ್ರೀಟ್‌ಫ್ಲಡ್");
    expect(TRANSLATIONS.kn.nearestShelter).toContain("ಆಶ್ರಯ");
    expect(TRANSLATIONS.kn.emergencyHotline).toContain("1533");
    expect(TRANSLATIONS.kn.tabMap).toBe("ನಕ್ಷೆ");
    expect(TRANSLATIONS.kn.tabReport).toBe("ವರದಿ ಮಾಡಿ");
    expect(TRANSLATIONS.kn.tabAlerts).toBe("ಎಚ್ಚರಿಕೆಗಳು");
    expect(TRANSLATIONS.kn.tabHelp).toBe("ಸಹಾಯ");
  });
});
