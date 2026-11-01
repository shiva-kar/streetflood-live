import type { RoadRouteStep } from "@/lib/flood/types";

export interface NavigationInstruction extends RoadRouteStep {
  index: number;
  distanceRemainingMeters: number;
  spokenText: string;
}

export function buildNavigationInstructions(steps: RoadRouteStep[]): NavigationInstruction[] {
  const total = steps.reduce((sum, step) => sum + step.distanceMeters, 0);
  let remaining = total;
  return steps.map((step, index) => {
    remaining -= step.distanceMeters;
    return {
      ...step,
      index,
      distanceRemainingMeters: Math.max(0, Math.round(remaining)),
      spokenText: `${step.instruction} on ${step.streetName || "the current road"} in ${Math.round(step.distanceMeters)} metres.`,
    };
  });
}

export function nearestInstruction(instructions: NavigationInstruction[], distanceTravelledMeters: number) {
  const total = instructions.reduce((sum, item) => sum + item.distanceMeters, 0);
  const target = Math.max(0, Math.min(total, distanceTravelledMeters));
  let elapsed = 0;
  for (const instruction of instructions) {
    elapsed += instruction.distanceMeters;
    if (target <= elapsed) return instruction;
  }
  return instructions.at(-1) ?? null;
}
