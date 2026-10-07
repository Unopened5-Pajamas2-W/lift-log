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

/** Corpus-anchored single-rep RPE → %1RM map (doc §2.3: 1 @9 ≈ 95%; openers
 *  90–92% ≈ RPE 8; §2.2: a 90% single is ~RPE 8), linearly interpolated at
 *  half steps and clamped to [7, 10] — below RPE 7 the gauge is noise. */
const RPE_SINGLE_PCT: readonly { rpe: number; pct: number }[] = [
  { rpe: 7, pct: 0.9 },
  { rpe: 8, pct: 0.92 },
  { rpe: 9, pct: 0.95 },
  { rpe: 9.5, pct: 0.97 },
  { rpe: 10, pct: 1.0 },
];

/** %1RM a single at `rpe` represents (RPE 7–10, half-step interpolation). */
export function pct1rmForRpe(rpe: number): number {
  const t = Math.min(10, Math.max(7, rpe));
  for (let i = 0; i < RPE_SINGLE_PCT.length - 1; i++) {
    const a = RPE_SINGLE_PCT[i]!;
    const b = RPE_SINGLE_PCT[i + 1]!;
    if (t <= b.rpe)
      return a.pct + ((b.pct - a.pct) * (t - a.rpe)) / (b.rpe - a.rpe);
  }
  return 1;
}

/** THE e1RM calculator for every surface (§6.5: always the same calculator).
 *  Multi-rep sets → Epley; a single with logged RPE ≥ 7 → load / pct(RPE)
 *  (1 @9 RPE ≈ 95% → e1RM = load / 0.95). Unlogged or light singles stay on
 *  the Epley path. Returns 0 for invalid/bodyweight-only sets. */
export function setE1RM(
  set: Pick<WorkoutSet, "weightKg" | "addedWeightKg" | "reps" | "rpe">,
): number {
  const load = set.weightKg + (set.addedWeightKg ?? 0);
  if (set.reps === 1 && typeof set.rpe === "number" && set.rpe >= 7)
    return load / pct1rmForRpe(set.rpe);
  return epley1RM(load, set.reps);
}

/** Best e1RM across completed working sets (warmups excluded; 0 if none qualify). */
export function sessionBestE1RM(
  sets: Pick<
    WorkoutSet,
    "weightKg" | "addedWeightKg" | "reps" | "rpe" | "completed" | "isWarmup"
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

/** Minimal set shape the session helpers need. */
export interface SetLike {
  completed: boolean;
  workoutId?: string;
  isWarmup?: boolean;
  createdAt?: number;
  weightKg: number;
  addedWeightKg?: number;
  reps: number;
  rpe?: number;
}

/** Completed working sets grouped by session, newest first (session time =
 *  max createdAt per workoutId; warmups/incompletes excluded; unkeyed input
 *  forms a single timeless group). Canonical grouping for all e1RM/overload
 *  derivations. */
export function groupBySession<T extends SetLike>(
  sets: T[],
): { time: number; sets: T[] }[] {
  const bySession = new Map<string, { time: number; sets: T[] }>();
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
  return [...bySession.values()].sort((a, b) => b.time - a.time);
}

/** Best e1RM across the most recent session's sets (§6.5 running trend); 0 = none. */
export function runningE1RM(sets: SetLike[]): number {
  const latest = groupBySession(sets)[0];
  return latest ? sessionBestE1RM(latest.sets) : 0;
}

/** RPE of the heaviest set in the most recent session (§2.3 gauge input). */
export function lastTopRpe(sets: SetLike[]): number | undefined {
  const latest = groupBySession(sets)[0];
  if (!latest || latest.sets.length === 0) return undefined;
  const topWeight = Math.max(...latest.sets.map((s) => s.weightKg));
  const topRpes = latest.sets
    .filter((s) => s.weightKg === topWeight && typeof s.rpe === "number")
    .map((s) => s.rpe as number);
  return topRpes.length > 0 ? Math.max(...topRpes) : undefined;
}
