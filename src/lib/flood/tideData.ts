import { fetchRealWeather } from "./openData";

export type TideTrend = "Rising" | "Falling" | "Peak";
export type TideWarningLevel = "Normal" | "Elevated" | "Surge Warning";

export interface TideStatus {
  heightMeters: number;
  trend: TideTrend;
  warningLevel: TideWarningLevel;
  observedAt: string;
  nextHighTide?: string;
}

/**
 * Mumbai tide reference points published by the Indian tide calendar.
 * The table is intentionally conservative: it is used as an advisory
 * indicator and never replaces BMC/IMD warnings.
 */
const MUMBAI_TIDE_CALENDAR = [
  { month: 6, day: 21, high: 4.87, low: 0.42 },
  { month: 7, day: 5, high: 4.72, low: 0.51 },
  { month: 7, day: 20, high: 4.87, low: 0.38 },
  { month: 8, day: 3, high: 4.65, low: 0.55 },
  { month: 8, day: 18, high: 4.78, low: 0.44 },
  { month: 9, day: 2, high: 4.58, low: 0.61 },
  { month: 9, day: 17, high: 4.66, low: 0.52 },
] as const;

export function getCurrentTideStatus(now = new Date(), rainRateMmPerHour = 0): TideStatus {
  const entry = MUMBAI_TIDE_CALENDAR.find(
    (tide) => tide.month === now.getMonth() + 1 && tide.day === now.getDate(),
  );
  const day = entry ? 0.5 : 0.35;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const phase = minutes % 745;
  const rising = phase < 360;
  const peak = phase >= 345 && phase <= 390;
  const high = entry?.high ?? 4.25;
  const low = entry?.low ?? 0.55;
  const fraction = rising ? phase / 360 : 1 - (phase - 360) / 385;
  const heightMeters = Number((low + Math.max(0, Math.min(1, fraction)) * (high - low)).toFixed(2));
  const warningLevel =
    heightMeters > 4.5 && rainRateMmPerHour > 20
      ? "Surge Warning"
      : heightMeters > 4.2
        ? "Elevated"
        : "Normal";

  return {
    heightMeters,
    trend: peak ? "Peak" : rising ? "Rising" : "Falling",
    warningLevel,
    observedAt: now.toISOString(),
    nextHighTide: entry ? `${String(entry.month).padStart(2, "0")}-${String(entry.day).padStart(2, "0")}` : undefined,
  };
}

export async function getLiveTideStatus(now = new Date(), lat = 19.04, lng = 72.87) {
  const weather = await fetchRealWeather(lat, lng);
  return {
    ...getCurrentTideStatus(now, weather.rainRateMmPerHour),
    rainRateMmPerHour: weather.rainRateMmPerHour,
  };
}
