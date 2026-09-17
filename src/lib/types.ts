/** Shared domain types. Canonical weight unit is kilograms (kg). */
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "fullbody";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "kettlebell"
  | "bodyweight"
  | "band"
  | "ez-bar"
  | "smith"
  | "other";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  difficulty: Difficulty;
  instructions: string[];
  tips?: string;
  isCustom: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export type WorkoutStatus = "active" | "completed" | "discarded";

export interface Workout {
  id: string;
  title: string;
  startedAt: number;
  endedAt?: number;
  status: WorkoutStatus;
  templateId?: string;
  seed?: number;
  notes?: string;
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  /** Canonical kilograms. Bodyweight-only sets use 0 + optional addedWeightKg. */
  weightKg: number;
  addedWeightKg?: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  /** Warmup rows (8×60% + 3×85%) — excluded from e1RM, volume, PRs, recovery, suggestions. Absent = working set. */
  isWarmup?: boolean;
  createdAt: number;
}

export interface TemplateItem {
  exerciseId: string;
  sets: { weightKg: number; reps: number; isWarmup?: boolean }[];
}

export interface Template {
  id: string;
  name: string;
  items: TemplateItem[];
  /** v2 seam: canned programs attach here without schema break. */
  programId?: string;
  createdAt: number;
  updatedAt: number;
}

export type Units = "kg" | "lb";

export interface Settings {
  id: "app";
  units: Units;
  equipment: Equipment[];
  restSeconds: number;
  /** Olympic/bar weight in canonical kg for the plate calculator. Default 20. */
  barWeightKg: number;
  recoveryOverrides: Partial<Record<MuscleGroup, number | null>>;
  disclaimerAccepted: boolean;
  /** v2 seam: unknown future fields (sync, health) survive backup round-trips. */
  [key: string]: unknown;
}

export const SCHEMA_VERSION = 1;
export const DB_NAME = "workout-pwa";
