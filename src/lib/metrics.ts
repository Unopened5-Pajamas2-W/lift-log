/** Pure strength metrics: volume, Epley e1RM, PR detection. Dependency-free. */
import type { WorkoutSet } from "./types.ts";

export const MAX_REPS_FOR_E1RM = 30;
const PR_EPSILON = 1.001;

export function setVolume(
  set: Pick<WorkoutSet, "weightKg" | "addedWeightKg" | "reps">,
): number {
  const w = set.weightKg + (set.addedWeightKg ?? 0);
  return w > 0 && set.reps > 0 ? w * set.reps : 0;
}

/** Epley estimated 1RM. Returns 0 for invalid/bodyweight-only sets. */
export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps < 1) return 0;
  const r = Math.min(reps, MAX_REPS_FOR_E1RM);
  return weightKg * (1 + r / 30);
}

export function setE1RM(
  set: Pick<WorkoutSet, "weightKg" | "addedWeightKg" | "reps">,
): number {
  return epley1RM(set.weightKg + (set.addedWeightKg ?? 0), set.reps);
}

/** Best e1RM across completed working sets (warmups excluded; 0 if none qualify). */
export function sessionBestE1RM(
  sets: Pick<
    WorkoutSet,
    "weightKg" | "addedWeightKg" | "reps" | "completed" | "isWarmup"
  >[],
): number {
  let best = 0;
  for (const s of sets) {
    if (!s.completed || s.isWarmup === true) continue;
    best = Math.max(best, setE1RM(s));
  }
  return best;
}

export function sessionVolume(
  sets: Pick<
    WorkoutSet,
    "weightKg" | "addedWeightKg" | "reps" | "completed" | "isWarmup"
  >[],
): number {
  return sets
    .filter((s) => s.completed && s.isWarmup !== true)
    .reduce((sum, s) => sum + setVolume(s), 0);
}

/** True when `current` is a genuine PR over `previousBest` (epsilon guards float noise). */
export function isPR(current: number, previousBest: number): boolean {
  if (current <= 0) return false;
  if (previousBest <= 0) return true; // first-ever log
  return current > previousBest * PR_EPSILON;
}

export interface PRCheck {
  e1rmPR: boolean;
  volumePR: boolean;
  firstLog: boolean;
}

export function checkPRs(
  currentBest: number,
  currentVolume: number,
  prevBest: number,
  prevVolume: number,
): PRCheck {
  const firstLog = prevBest <= 0 && prevVolume <= 0;
  return {
    e1rmPR: isPR(currentBest, prevBest),
    volumePR: isPR(currentVolume, prevVolume),
    firstLog,
  };
}
