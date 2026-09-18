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

/** Body backdrop silhouettes (base tone) + head per side.
 * viewBox 0 0 100 200. Muscles render on top, slightly inset. */
export const BODY_BASE: { side: "front" | "back"; path: string }[] = [
  {
    side: "front",
    path:
      "M50,4 m-8,0 a8,9 0 1,0 16,0 a8,9 0 1,0 -16,0 z " +
      "M28,32 q22,-9 44,0 l5,5 q4,32 -1,72 l-5,58 q0,9 -8,9 q-7,0 -7,-9 l-2,-45 h-8 l-2,45 q0,9 -7,9 q-8,0 -8,-9 l-5,-58 q-5,-40 -1,-72 z",
  },
  {
    side: "back",
    path:
      "M50,4 m-8,0 a8,9 0 1,0 16,0 a8,9 0 1,0 -16,0 z " +
      "M28,32 q22,-9 44,0 l5,5 q4,32 -1,72 l-5,58 q0,9 -8,9 q-7,0 -7,-9 l-2,-45 h-8 l-2,45 q0,9 -7,9 q-8,0 -8,-9 l-5,-58 q-5,-40 -1,-72 z",
  },
];

/** Simple front/back figure coordinates for the SVG heatmap (viewBox 0 0 100 200).
 * Rounded muscle bellies with deltoid caps overlapping the torso.
 * `lx/ly` is the % label anchor. `fullbody` has no shape: it is list-only
 * (aggregate of all regions) and never silently dropped from the list. */
export const MUSCLE_SHAPES: {
  muscle: MuscleGroup;
  side: "front" | "back";
  path: string;
  lx: number;
  ly: number;
}[] = [
  {
    muscle: "chest",
    side: "front",
    path: "M31,42 h38 v16 q0,8 -8,8 h-22 q-8,0 -8,-8 z",
    lx: 50,
    ly: 55,
  },
  {
    muscle: "shoulders",
    side: "front",
    path:
      "M20,42 q-3,9 1,18 q3,3 7,0 q3,-9 -1,-18 q-3,-3 -7,0 z " +
      "M73,42 q-3,9 1,18 q3,3 7,0 q3,-9 -1,-18 q-3,-3 -7,0 z",
    lx: 50,
    ly: 40,
  },
  {
    muscle: "biceps",
    side: "front",
    path:
      "M22,62 h8 v18 q0,4 -4,4 q-4,0 -4,-4 z " +
      "M70,62 h8 v18 q0,4 -4,4 q-4,0 -4,-4 z",
    lx: 50,
    ly: 72,
  },
  {
    muscle: "core",
    side: "front",
    path: "M38,70 h24 v28 q0,6 -6,6 h-12 q-6,0 -6,-6 z",
    lx: 50,
    ly: 86,
  },
  {
    muscle: "quads",
    side: "front",
    path:
      "M33,104 h13 v32 q0,6 -6,6 q-6,0 -6,-6 z " +
      "M54,104 h13 v32 q0,6 -6,6 q-6,0 -6,-6 z",
    lx: 50,
    ly: 122,
  },
  {
    muscle: "calves",
    side: "front",
    path:
      "M35,150 h11 v20 q0,5 -5,5 q-5,0 -5,-5 z " +
      "M54,150 h11 v20 q0,5 -5,5 q-5,0 -5,-5 z",
    lx: 50,
    ly: 162,
  },
  {
    muscle: "back",
    side: "back",
    path: "M31,42 h38 v26 q0,8 -8,8 h-22 q-8,0 -8,-8 z",
    lx: 50,
    ly: 57,
  },
  {
    muscle: "triceps",
    side: "back",
    path:
      "M22,62 h8 v18 q0,4 -4,4 q-4,0 -4,-4 z " +
      "M70,62 h8 v18 q0,4 -4,4 q-4,0 -4,-4 z",
    lx: 50,
    ly: 72,
  },
  {
    muscle: "glutes",
    side: "back",
    path:
      "M33,76 h13 v15 q0,5 -6,5 q-6,0 -6,-5 z " +
      "M54,76 h13 v15 q0,5 -6,5 q-6,0 -6,-5 z",
    lx: 50,
    ly: 86,
  },
  {
    muscle: "hamstrings",
    side: "back",
    path:
      "M33,96 h13 v34 q0,6 -6,6 q-6,0 -6,-6 z " +
      "M54,96 h13 v34 q0,6 -6,6 q-6,0 -6,-6 z",
    lx: 50,
    ly: 115,
  },
];
