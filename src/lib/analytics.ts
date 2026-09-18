/**
 * Pure analytics derivations for the Progress layer: per-exercise session
 * series, rep-max ladder, muscle volume split, and week-based consistency.
 * Composes metrics.ts (warmup/incomplete exclusion is never re-implemented).
 * Must stay import-clean of DOM/chart code so unit tests run without a canvas.
 */
import type { Exercise, MuscleGroup, Workout, WorkoutSet } from "./types.ts";
import { sessionBestE1RM, sessionVolume, setE1RM } from "./metrics.ts";

const MS_PER_DAY = 86_400_000;
/** Targets for the rep-max ladder (spec R4). */
export const LADDER_TARGETS: readonly number[] = [1, 3, 5, 8, 10, 12];

/** Range keys for windowed analytics (R3 drill-in chart, R7 muscle split). */
export type RangeKey = "30d" | "90d" | "3M" | "6M" | "1Y" | "All";
const RANGE_DAYS: Partial<Record<RangeKey, number>> = {
  "30d": 30,
  "90d": 90,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

/** One plotted session for the drill-in chart. */
export interface SessionPoint {
  workoutId: string;
  /** Workout startedAt, epoch ms. */
  t: number;
  /** Session-best Epley e1RM in kg; 0 = no qualifying set (chart gap). */
  bestE1rmKg: number;
  /** Completed working-set volume in kg (bodyweight-only sessions are 0). */
  volumeKg: number;
}

/** Best actual set for one rep target of the ladder (R4). */
export interface LadderRow {
  targetReps: number;
  /** null = no completed working set with exactly this rep count. */
  weightKg: number | null;
  reps: number;
  e1rmKg: number;
  achievedAt: number;
}

/** Consistency snapshot for the Progress card (R8). */
export interface ConsistencyStats {
  currentWeekStreak: number;
  bestWeekStreak: number;
  sessionsLast30Days: number;
  avgSessionsPerWeek8w: number;
}

/** Volume share of one primary muscle for the split card (R7). */
export interface MuscleSplitRow {
  muscle: MuscleGroup;
  volumeKg: number;
  share: number;
}

/** Epoch-ms cutoff for a range key at `nowMs`; null = unbounded ("All"). Pure. */
export function windowCutoff(range: RangeKey, nowMs: number): number | null {
  const days = RANGE_DAYS[range];
  return days == null ? null : nowMs - days * MS_PER_DAY;
}

/** Local Monday of the week containing `ms`, as `YYYY-MM-DD` (DST-safe:
 *  date-component math only, never 7-day millisecond arithmetic). */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  const monday = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() - ((d.getDay() + 6) % 7),
  );
  return mondayKey(monday);
}

/** Inverse of weekKey: the local Monday midnight for a `YYYY-MM-DD` key. */
function keyDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Format a local date as `YYYY-MM-DD` without timezone conversion. */
function mondayKey(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole calendar days between two local midnights (DST-free via UTC math). */
function calendarDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / MS_PER_DAY);
}

/** Group sets by workoutId, keeping only workouts whose id is in `ids`
 *  (pass null to keep all). Shared by the drill-in and the aggregate view. */
export function groupByWorkout(
  sets: WorkoutSet[],
  ids: Set<string> | null = null,
): Map<string, WorkoutSet[]> {
  const groups = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    if (ids && !ids.has(s.workoutId)) continue;
    const list = groups.get(s.workoutId);
    if (list) list.push(s);
    else groups.set(s.workoutId, [s]);
  }
  return groups;
}

/** Per-session best e1RM and volume series for one exercise, ascending by
 *  startedAt (spec §4.1.1; exclusions inherited from metrics.ts). */
export function exerciseSessionPoints(
  sets: WorkoutSet[],
  workouts: Workout[],
): SessionPoint[] {
  const startedAt = new Map<string, number>();
  for (const wk of workouts)
    if (wk.status === "completed") startedAt.set(wk.id, wk.startedAt);
  const points: SessionPoint[] = [];
  for (const [workoutId, list] of groupByWorkout(sets, new Set(startedAt.keys()))) {    const t = startedAt.get(workoutId) ?? 0;
    points.push({
      workoutId,
      t,
      bestE1rmKg: sessionBestE1RM(list),
      volumeKg: sessionVolume(list),
    });
  }
  return points.sort((a, b) => a.t - b.t || a.workoutId.localeCompare(b.workoutId));
}

/** Heavier wins; equal weights break ties toward the most recent set. */
function beats(candidate: WorkoutSet, incumbent: WorkoutSet): boolean {
  const cw = candidate.weightKg + (candidate.addedWeightKg ?? 0);
  const iw = incumbent.weightKg + (incumbent.addedWeightKg ?? 0);
  return cw > iw || (cw === iw && candidate.createdAt > incumbent.createdAt);
}

/** Rep-max ladder (R4): best actual completed working set per exact rep
 *  count, ties → latest; targets with no set keep their row as null. */
export function repMaxLadder(
  sets: WorkoutSet[],
  targets: readonly number[] = LADDER_TARGETS,
): LadderRow[] {
  const working = sets.filter((s) => s.completed && s.isWarmup !== true);
  return targets.map((targetReps) => {
    let best: WorkoutSet | undefined;
    for (const s of working) {
      if (s.reps !== targetReps) continue;
      if (!best || beats(s, best)) best = s;
    }
    if (!best)
      return { targetReps, weightKg: null, reps: targetReps, e1rmKg: 0, achievedAt: 0 };
    return {
      targetReps,
      weightKg: best.weightKg + (best.addedWeightKg ?? 0),
      reps: best.reps,
      e1rmKg: setE1RM(best),
      achievedAt: best.createdAt,
    };
  });
}

/** Muscle volume split (R7): completed working-set volume per primary
 *  muscle within `[windowStartMs, ∞)` (null = all); unresolvable exercise
 *  ids are dropped (same tolerance as existing views). Pure. */
export function muscleSplit(
  sets: WorkoutSet[],
  exercisesById: Map<string, Exercise>,
  windowStartMs: number | null,
): MuscleSplitRow[] {
  const totals = new Map<MuscleGroup, number>();
  for (const s of sets) {
    if (!s.completed || s.isWarmup === true) continue;
    if (windowStartMs != null && s.createdAt < windowStartMs) continue;
    const ex = exercisesById.get(s.exerciseId);
    if (!ex) continue;
    const v = s.weightKg + (s.addedWeightKg ?? 0);
    if (v <= 0 || s.reps <= 0) continue;
    totals.set(ex.primaryMuscle, (totals.get(ex.primaryMuscle) ?? 0) + v * s.reps);
  }
  const total = [...totals.values()].reduce((sum, v) => sum + v, 0);
  if (total <= 0) return [];
  return [...totals.entries()]
    .map(([muscle, volumeKg]) => ({ muscle, volumeKg, share: volumeKg / total }))
    .sort((a, b) => b.volumeKg - a.volumeKg || a.muscle.localeCompare(b.muscle));
}

/** Current streak walks back from the current week, granting the in-progress
 *  week a grace pass before counting previous weeks (spec §4.1.4). */
function currentStreak(
  counts: Map<string, number>,
  currentMonday: Date,
): number {
  let streak = 0;
  const cursor = new Date(currentMonday);
  if (!counts.has(mondayKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (counts.has(mondayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/** Longest run of consecutive week keys in `counts` (calendar-day steps). */
function bestStreak(counts: Map<string, number>): number {
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of [...counts.keys()].sort()) {
    const d = keyDate(key);
    run = prev && calendarDays(prev, d) === 7 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Consistency card stats (R8): week streaks (Mon-based, local time),
 *  completed-workout count in the last 30 days, and average completed
 *  workouts per week over the 8 full weeks preceding the current one. */
export function consistencyStats(
  completedWorkoutStarts: number[],
  nowMs: number,
): ConsistencyStats {
  const counts = new Map<string, number>();
  for (const t of completedWorkoutStarts) {
    const key = weekKey(t);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const currentMonday = keyDate(weekKey(nowMs));
  const windowStart = new Date(currentMonday);
  windowStart.setDate(windowStart.getDate() - 56);
  const inTrailing8 = completedWorkoutStarts.filter(
    (t) => t >= windowStart.getTime() && t < currentMonday.getTime(),
  ).length;
  return {
    currentWeekStreak: currentStreak(counts, currentMonday),
    bestWeekStreak: bestStreak(counts),
    sessionsLast30Days: completedWorkoutStarts.filter(
      (t) => t > nowMs - 30 * MS_PER_DAY,
    ).length,
    avgSessionsPerWeek8w: Number((inTrailing8 / 8).toFixed(1)),
  };
}
