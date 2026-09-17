/**
 * Rule-based next-workout generator (FitBod-lite) + progressive-overload prefill.
 * Pure + deterministic given (inputs, seed). v2 seam: optional `programId`
 * lets canned programs bias selection without changing this algorithm's shape.
 */
import { LOWER_BODY, MUSCLE_PATTERN } from "../data/muscles.ts";
import type {
  Equipment,
  Exercise,
  MuscleGroup,
  Units,
  WorkoutSet,
} from "./types.ts";
import { mulberry32 } from "./rng.ts";
import { overloadIncrementKg } from "./units.ts";

export type Focus =
  "full-body" | "upper" | "lower" | "push" | "pull" | "custom";

export interface SuggestInput {
  durationMin: 20 | 30 | 45 | 60;
  focus: Focus;
  customMuscles?: MuscleGroup[];
  equipment: readonly Equipment[];
  recovery: Record<MuscleGroup, number>;
  library: Exercise[];
  /** exerciseId → completed sets of most recent session (for overload + novelty). */
  lastPerformance: Map<
    string,
    Pick<WorkoutSet, "weightKg" | "reps" | "completed" | "createdAt">[]
  >;
  lastDoneAt: Map<string, number>;
  disliked?: Set<string>;
  seed: number;
  units: Units;
  programId?: string; // v2 seam: canned program id (currently advisory only)
  allowFatigued?: boolean;
}

export interface SuggestedItem {
  exerciseId: string;
  sets: { weightKg: number; reps: number }[];
  suggestedWeightKg: number;
  explanation: string;
}

const FOCUS_MUSCLES: Record<Exclude<Focus, "custom">, MuscleGroup[] | null> = {
  "full-body": null, // balanced across patterns
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves"],
  push: ["chest", "shoulders", "triceps", "quads"],
  pull: ["back", "biceps", "hamstrings", "glutes"],
};

function targetMuscles(input: SuggestInput): MuscleGroup[] | null {
  if (input.focus === "custom") return input.customMuscles ?? null;
  return FOCUS_MUSCLES[input.focus];
}

/** Progressive-overload prefill for one exercise's top set. */
export function suggestNextWeight(
  lastSets: Pick<WorkoutSet, "weightKg" | "reps" | "completed">[],
  primaryMuscle: MuscleGroup,
  units: Units,
): { weightKg: number; reps: number } {
  const done = lastSets.filter((s) => s.completed);
  if (done.length === 0) return { weightKg: 20, reps: 8 };
  const top = done.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
  const target = Math.max(...done.map((s) => s.reps));
  const allHitTarget = done.every((s) => s.reps >= target);
  const worstShortfall = Math.min(...done.map((s) => s.reps - target));
  if (worstShortfall <= -4) {
    // Repeated struggle → deload 5%.
    return { weightKg: Math.round(top.weightKg * 0.95 * 4) / 4, reps: target };
  }
  if (!allHitTarget) return { weightKg: top.weightKg, reps: target };
  const inc = overloadIncrementKg(LOWER_BODY.has(primaryMuscle), units);
  return { weightKg: Math.round((top.weightKg + inc) * 4) / 4, reps: target };
}

export function generateWorkout(input: SuggestInput): {
  items: SuggestedItem[];
  explanations: string[];
} {
  const rand = mulberry32(input.seed);
  const targets = targetMuscles(input);
  const owned = new Set(input.equipment);
  const now = Date.now();

  const eligible = input.library.filter((e) => {
    if (e.isArchived) return false;
    if (e.equipment !== "bodyweight" && !owned.has(e.equipment)) return false;
    if (targets && !targets.includes(e.primaryMuscle)) return false;
    const rec = input.recovery[e.primaryMuscle] ?? 100;
    if (!input.allowFatigued && rec < 30) return false;
    return true;
  });

  const scored = eligible.map((e) => {
    const lastAt = input.lastDoneAt.get(e.id);
    const daysSince =
      lastAt == null ? 30 : Math.max(0, (now - lastAt) / 86_400_000);
    const freshness = Math.min(40, (daysSince / 14) * 40);
    const rec = input.recovery[e.primaryMuscle] ?? 100;
    const recoveryFit = rec >= 70 ? 30 : rec >= 30 ? 15 : 0;
    const pattern = MUSCLE_PATTERN[e.primaryMuscle];
    const patternBonus =
      input.focus === "full-body" ? 10 : pattern === "core" ? 0 : 10;
    const dislike = input.disliked?.has(e.id) ? 50 : 0;
    const jitter = rand() * 5;
    return {
      e,
      score: freshness + recoveryFit + patternBonus - dislike + jitter,
      freshness,
      rec,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Balance push/pull/legs for full-body; otherwise take top in order.
  const budgetMin = input.durationMin;
  const maxExercises =
    budgetMin <= 20 ? 4 : budgetMin <= 30 ? 5 : budgetMin <= 45 ? 6 : 8;
  const picked: typeof scored = [];
  if (input.focus === "full-body") {
    const byPattern = new Map<string, typeof scored>();
    for (const s of scored) {
      const p = MUSCLE_PATTERN[s.e.primaryMuscle];
      if (!byPattern.has(p)) byPattern.set(p, []);
      byPattern.get(p)?.push(s);
    }
    const order = ["push", "pull", "legs", "core", "fullbody"];
    let i = 0;
    while (
      picked.length < Math.min(maxExercises, scored.length) &&
      i < maxExercises * 2
    ) {
      const bucket = byPattern.get(order[i % order.length] as string);
      const next = bucket?.shift();
      if (next && !picked.includes(next)) picked.push(next);
      i++;
    }
    for (const s of scored) {
      if (picked.length >= maxExercises) break;
      if (!picked.includes(s)) picked.push(s);
    }
  } else {
    picked.push(...scored.slice(0, maxExercises));
  }

  const items: SuggestedItem[] = picked.map(({ e, freshness, rec }) => {
    const last = input.lastPerformance.get(e.id) ?? [];
    const suggestion = suggestNextWeight(last, e.primaryMuscle, input.units);
    const setCount = budgetMin <= 20 ? 2 : 3;
    return {
      exerciseId: e.id,
      sets: Array.from({ length: setCount }, () => ({ ...suggestion })),
      suggestedWeightKg: suggestion.weightKg,
      explanation:
        last.length === 0
          ? `${e.name}: new movement, starting light (${rec}% ${e.primaryMuscle} recovered).`
          : `${e.name}: last ${Math.max(...last.map((s) => s.weightKg))} kg → ${suggestion.weightKg} kg (${rec}% recovered${freshness > 20 ? ", fresh rotation" : ""}).`,
    };
  });

  return { items, explanations: items.map((i) => i.explanation) };
}
