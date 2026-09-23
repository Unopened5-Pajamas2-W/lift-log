/** Shared domain types. Canonical weight unit is kilograms (kg). */
import type { DBSchema } from "idb";

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
  /** v2: linkage to the program slot this workout was started from (derived progress inputs). */
  programId?: string;
  programWeek?: number;
  programDayIndex?: number;
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
  /** v2: id of the single active program; absent = none. */
  activeProgramId?: string;
  /** v2 seam: unknown future fields (sync, health) survive backup round-trips. */
  [key: string]: unknown;
}

/** v2 program schemes. Discriminated by `kind` so validation stays local.
 * - "sets-reps": exact sets × reps at a fixed weight (weightKg absent = engine-suggested).
 * - "percent": % of a per-lift training max (5/3/1 style), exact math — never engine- or RPE-adjusted.
 * - "double": reps band; the global double-progression engine moves weight/reps within it.
 */
export type ProgramScheme =
  | { kind: "sets-reps"; sets: number; reps: number; weightKg?: number }
  | { kind: "percent"; sets: { pct: number; reps: number }[] }
  | { kind: "double"; sets: number; minReps: number; maxReps: number };

export interface ProgramItem {
  exerciseId: string;
  scheme?: ProgramScheme;
  /** Required when scheme.kind === "percent" (user-entered training max, canonical kg). */
  trainingMaxKg?: number;
}

export interface ProgramDay {
  name: string;
  items: ProgramItem[];
}

export interface ProgramWeek {
  label: string;
  days: ProgramDay[];
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  weeks: ProgramWeek[];
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const SCHEMA_VERSION = 2;
export const DB_NAME = "workout-pwa";

/** Typed IndexedDB layout (idb DBSchema): store → key/value/index types. */
export interface LiftLogDB extends DBSchema {
  exercises: {
    key: string;
    value: Exercise;
    indexes: {
      "by-muscle": MuscleGroup;
      "by-equipment": Equipment;
    };
  };
  workouts: {
    key: string;
    value: Workout;
    indexes: { "by-startedAt": number };
  };
  sets: {
    key: string;
    value: WorkoutSet;
    indexes: {
      "by-workoutId": string;
      "by-exerciseId": string;
    };
  };
  templates: { key: string; value: Template };
  programs: { key: string; value: Program };
  settings: { key: string; value: Settings };
  meta: { key: string; value: { id: string; schemaVersion: number } };
}
