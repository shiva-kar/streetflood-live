export interface HarmonicConstituent {
  name: string;
  amplitudeMeters: number;
  phaseDegrees: number;
  speedDegreesPerHour: number;
}

export interface TidePrediction {
  timestamp: string;
  heightMeters: number;
  astronomicalHeightMeters: number;
  backflowRisk: "Normal" | "Elevated" | "High";
  gatesClosed: boolean;
}

export const MUMBAI_TIDE_CONSTITUENTS: readonly HarmonicConstituent[] = [
  { name: "M2", amplitudeMeters: 0.92, phaseDegrees: 178, speedDegreesPerHour: 28.984104 },
  { name: "S2", amplitudeMeters: 0.38, phaseDegrees: 205, speedDegreesPerHour: 30 },
  { name: "K1", amplitudeMeters: 0.22, phaseDegrees: 112, speedDegreesPerHour: 15.041069 },
  { name: "O1", amplitudeMeters: 0.17, phaseDegrees: 248, speedDegreesPerHour: 13.943035 },
];

const DEG = Math.PI / 180;

export function predictHarmonicTide(
  timestamp: Date,
  options: {
    datumMeters?: number;
    constituents?: readonly HarmonicConstituent[];
    gateClosureMeters?: number;
    rainRateMmPerHour?: number;
  } = {},
): TidePrediction {
  const datum = options.datumMeters ?? 3.1;
  const constituents = options.constituents ?? MUMBAI_TIDE_CONSTITUENTS;
  const hours = timestamp.getTime() / 3_600_000;
  const astronomicalHeight = datum + constituents.reduce((sum, constituent) => {
    const phase = (constituent.speedDegreesPerHour * hours + constituent.phaseDegrees) * DEG;
    return sum + constituent.amplitudeMeters * Math.cos(phase);
  }, 0);
  const gateThreshold = options.gateClosureMeters ?? 4.2;
  const gatesClosed = astronomicalHeight >= gateThreshold;
  const rain = options.rainRateMmPerHour ?? 0;
  const backflowRisk = astronomicalHeight >= 4.5 && rain >= 20
    ? "High"
    : astronomicalHeight >= gateThreshold || rain >= 15
      ? "Elevated"
      : "Normal";
  return {
    timestamp: timestamp.toISOString(),
    heightMeters: Number(astronomicalHeight.toFixed(2)),
    astronomicalHeightMeters: Number(astronomicalHeight.toFixed(2)),
    backflowRisk,
    gatesClosed,
  };
}

export function sampleTideSeries(start: Date, hours: number, stepMinutes = 15, rainRateMmPerHour = 0) {
  if (hours <= 0 || stepMinutes <= 0) throw new Error("Tide series interval must be positive.");
  const samples: TidePrediction[] = [];
  for (let minute = 0; minute <= hours * 60; minute += stepMinutes) {
    samples.push(predictHarmonicTide(new Date(start.getTime() + minute * 60_000), { rainRateMmPerHour }));
  }
  return samples;
}
