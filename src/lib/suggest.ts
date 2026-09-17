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
  /** exerciseId → completed sets of recent sessions (for overload + novelty). */
  lastPerformance: Map<
    string,
    Pick<
      WorkoutSet,
      "weightKg" | "reps" | "completed" | "createdAt" | "workoutId" | "isWarmup"
    >[]
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
  sets: { weightKg: number; reps: number; isWarmup?: boolean }[];
  suggestedWeightKg: number;
  explanation: string;
}

/** Recent-window + warmup tuning. Exported for tests and explanations. */
export const MAX_SESSIONS_FOR_BASELINE = 3;
/** Never prescribe more than the baseline when history is this stale. */
export const STALE_DAYS = 21;
/** Warmup ramp prepended to the first exercise per primary muscle. */
export const WARMUP_SETS: readonly { reps: number; pct: number }[] = [
  { reps: 8, pct: 0.6 },
  { reps: 3, pct: 0.85 },
];

/** Warmup rows for a working weight (8×60% + 3×85%), flagged warmup. */
export function buildWarmupSets(
  workingKg: number,
): { weightKg: number; reps: number; isWarmup: true }[] {
  return WARMUP_SETS.map((w) => ({
    weightKg: round4(workingKg * w.pct),
    reps: w.reps,
    isWarmup: true as const,
  }));
}

/** Quarter-kg rounding (matches the rest of the codebase). */
function round4(v: number): number {
  return Math.round(v * 4) / 4;
}

export type OverloadHistory = Pick<WorkoutSet, "weightKg" | "reps" | "completed"> &
  Partial<Pick<WorkoutSet, "workoutId" | "createdAt" | "isWarmup">>;

interface WorkingSession {
  sessionTime: number;
  /** Heaviest completed working weight in the session. */
  top: number;
  target: number;
  worstShortfall: number;
  allHit: boolean;
}

/**
 * Group completed working sets into sessions (by workoutId, recency from
 * max createdAt, newest first), capped at MAX_SESSIONS_FOR_BASELINE.
 * Warmups and incompletes never contribute. Inputs without workoutId
 * (e.g. legacy unit vectors) form a single session with unknown time (0),
 * which also opts out of the staleness guard.
 */
export function groupWorkingSessions(sets: OverloadHistory[]): WorkingSession[] {
  const bySession = new Map<string, { time: number; sets: OverloadHistory[] }>();
  for (const s of sets) {
    if (!s.completed || s.isWarmup === true) continue;
    const key = s.workoutId ?? "__single__";
    let g = bySession.get(key);
    if (!g) {
      g = { time: 0, sets: [] };
      bySession.set(key, g);
    }
    g.sets.push(s);
    if (typeof s.createdAt === "number" && Number.isFinite(s.createdAt))
      g.time = Math.max(g.time, s.createdAt);
  }
  return [...bySession.values()]
    .map((g) => {
      const top = Math.max(...g.sets.map((s) => s.weightKg));
      const target = Math.max(...g.sets.map((s) => s.reps));
      const shortfalls = g.sets.map((s) => s.reps - target);
      return {
        sessionTime: g.time,
        top,
        target,
        worstShortfall: Math.min(...shortfalls),
        allHit: shortfalls.every((d) => d >= 0),
      };
    })
    .sort((a, b) => b.sessionTime - a.sessionTime)
    .slice(0, MAX_SESSIONS_FOR_BASELINE);
}

/** Progressive-overload prefill for one exercise's top set. */
export function suggestNextWeight(
  lastSets: OverloadHistory[],
  primaryMuscle: MuscleGroup,
  units: Units,
  now = Date.now(),
): { weightKg: number; reps: number } {
  const sessions = groupWorkingSessions(lastSets);
  const latest = sessions[0];
  if (!latest) return { weightKg: 20, reps: 8 };
  const baseline =
    round4(sessions.reduce((sum, s) => sum + s.top, 0) / sessions.length);
  const target = latest.target;
  if (latest.worstShortfall <= -2) {
    // Struggle (spec §7: −2 or worse) → deload 5% off the recent baseline.
    return { weightKg: round4(baseline * 0.95), reps: target };
  }
  if (!latest.allHit) return { weightKg: baseline, reps: target };
  if (
    latest.sessionTime > 0 &&
    now - latest.sessionTime > STALE_DAYS * 86_400_000
  ) {
    // Stale history: hold the baseline, never progress off old numbers.
    return { weightKg: baseline, reps: target };
  }
  const inc = overloadIncrementKg(LOWER_BODY.has(primaryMuscle), units);
  return { weightKg: round4(baseline + inc), reps: target };
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

  const items: SuggestedItem[] = [];
  const warmedMuscles = new Set<MuscleGroup>();
  for (const { e, freshness, rec } of picked) {
    const last = input.lastPerformance.get(e.id) ?? [];
    const suggestion = suggestNextWeight(last, e.primaryMuscle, input.units);
    const setCount = budgetMin <= 20 ? 2 : 3;
    const working = Array.from({ length: setCount }, () => ({
      weightKg: suggestion.weightKg,
      reps: suggestion.reps,
    }));
    // First exercise per primary muscle opens with the warmup ramp.
    let sets: SuggestedItem["sets"] = working;
    if (!warmedMuscles.has(e.primaryMuscle)) {
      warmedMuscles.add(e.primaryMuscle);
      sets = [...buildWarmupSets(suggestion.weightKg), ...working];
    }
    const sessions = groupWorkingSessions(last);
    const latestTop = sessions[0]?.top;
    const history =
      sessions.length > 1
        ? `last ${sessions.length}-session avg ${round4(sessions.reduce((sum, s) => sum + s.top, 0) / sessions.length)} kg → ${suggestion.weightKg} kg`
        : `last ${latestTop ?? suggestion.weightKg} kg → ${suggestion.weightKg} kg`;
    items.push({
      exerciseId: e.id,
      sets,
      suggestedWeightKg: suggestion.weightKg,
      explanation:
        sessions.length === 0
          ? `${e.name}: new movement, starting light (${rec}% ${e.primaryMuscle} recovered).`
          : `${e.name}: ${history} (${rec}% recovered${freshness > 20 ? ", fresh rotation" : ""}).`,
    });
  }

  return { items, explanations: items.map((i) => i.explanation) };
}
