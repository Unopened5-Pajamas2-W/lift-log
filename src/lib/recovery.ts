/** Pure muscle-recovery model: 6-day linearly-decayed fatiguing volume → 0–100%. */
import {
  MUSCLE_CAPS,
  MUSCLE_GROUPS,
  RECOVERY_WINDOW_HOURS,
} from "../data/muscles.ts";
import type { Exercise, MuscleGroup, WorkoutSet } from "./types.ts";

export interface FatigueInput {
  set: Pick<
    WorkoutSet,
    "weightKg" | "addedWeightKg" | "reps" | "completed" | "createdAt" | "isWarmup"
  >;
  exercise: Pick<Exercise, "primaryMuscle" | "secondaryMuscles"> | undefined;
}

const PRIMARY_FACTOR = 1.0;
const SECONDARY_FACTOR = 0.5;
/** Bodyweight sets with no added load still tax recovery at half rate. */
const BODYWEIGHT_FATIGUE_FACTOR = 0.5;

function setContribution(
  set: FatigueInput["set"],
  exercise: FatigueInput["exercise"],
  muscle: MuscleGroup,
  now: number,
): number {
  if (!set.completed || !exercise) return 0;
  if (set.isWarmup === true) return 0; // warmups never tax recovery
  const isPrimary = exercise.primaryMuscle === muscle;
  const isSecondary = exercise.secondaryMuscles.includes(muscle);
  // fullbody exercises lightly tax everything
  const isFullbodyHit =
    exercise.primaryMuscle === "fullbody" && muscle !== "fullbody";
  if (!isPrimary && !isSecondary && !isFullbodyHit) return 0;
  const loadKg = set.weightKg + (set.addedWeightKg ?? 0);
  const base =
    loadKg > 0 ? loadKg * set.reps : set.reps * 20 * BODYWEIGHT_FATIGUE_FACTOR;
  const factor = isPrimary
    ? PRIMARY_FACTOR
    : isSecondary
      ? SECONDARY_FACTOR
      : 0.25;
  const ageH = (now - set.createdAt) / 3_600_000;
  if (ageH >= RECOVERY_WINDOW_HOURS) return 0;
  return base * factor * Math.max(0, 1 - ageH / RECOVERY_WINDOW_HOURS);
}

export function fatigueForMuscle(
  inputs: FatigueInput[],
  muscle: MuscleGroup,
  now: number,
): number {
  return inputs.reduce(
    (sum, i) => sum + setContribution(i.set, i.exercise, muscle, now),
    0,
  );
}

export function recoveryForMuscle(
  fatigue: number,
  muscle: MuscleGroup,
): number {
  const cap = MUSCLE_CAPS[muscle];
  return Math.round(100 * (1 - Math.min(1, fatigue / cap)));
}

/** Full recovery map, with manual overrides taking precedence until cleared. */
export function recoveryMap(
  inputs: FatigueInput[],
  overrides: Partial<Record<MuscleGroup, number | null>>,
  now = Date.now(),
): Record<MuscleGroup, number> {
  const out = {} as Record<MuscleGroup, number>;
  for (const m of MUSCLE_GROUPS) {
    const ov = overrides[m];
    if (typeof ov === "number") {
      out[m] = Math.max(0, Math.min(100, Math.round(ov)));
    } else {
      out[m] = recoveryForMuscle(fatigueForMuscle(inputs, m, now), m);
    }
  }
  return out;
}
