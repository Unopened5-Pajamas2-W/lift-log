/** Muscle metadata, fatigue caps, movement patterns, SVG heatmap coordinates. */
import type { Equipment, MuscleGroup } from "../lib/types.ts";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "fullbody",
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
  fullbody: "Full body",
};

/**
 * Fatigue caps in kg·reps. Tuned so ~12–20 hard sets zero a muscle.
 * Large groups 12000, small groups (arms/calves/core) 8000. Tune here.
 */
export const MUSCLE_CAPS: Record<MuscleGroup, number> = {
  chest: 12000,
  back: 12000,
  shoulders: 10000,
  biceps: 8000,
  triceps: 8000,
  quads: 12000,
  hamstrings: 10000,
  glutes: 12000,
  calves: 8000,
  core: 8000,
  fullbody: 12000,
};

/** Full recovery window: 6 days = 144 h (matches FitBod's ~6–7 day guidance). */
export const RECOVERY_WINDOW_HOURS = 144;

export type MovementPattern = "push" | "pull" | "legs" | "core" | "fullbody";

export const MUSCLE_PATTERN: Record<MuscleGroup, MovementPattern> = {
  chest: "push",
  shoulders: "push",
  triceps: "push",
  back: "pull",
  biceps: "pull",
  quads: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
  core: "core",
  fullbody: "fullbody",
};

/** Lower-body muscles get the bigger overload increment. */
export const LOWER_BODY: ReadonlySet<MuscleGroup> = new Set([
  "quads",
  "hamstrings",
  "glutes",
  "calves",
]);

export const ALL_EQUIPMENT: Equipment[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "kettlebell",
  "bodyweight",
  "band",
  "ez-bar",
  "smith",
  "other",
];
