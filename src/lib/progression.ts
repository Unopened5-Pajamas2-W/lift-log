/**
 * Double progression engine (v2 R12/R14). Pure — no IO, no Date.now default
 * passed implicitly; callers own time so vectors stay deterministic.
 *
 * Band semantics: reps band [floor, ceil]. Reps first, then weight:
 *  - latest session hit the band ceiling on all sets → +one overload increment,
 *    reps reset to floor;
 *  - all sets inside the band → hold weight, reps = min(lastBest + 1, ceil);
 *  - any set below floor → hold weight, reps stay at floor (the RPE rules and
 *    the existing −2 deload are the failure valves; this engine never reduces).
 *
 * RPE adjustments (warmups and unlogged sets excluded):
 *  - top-set RPE ≥ 9.5 → hold weight (block the increment even at band top);
 *  - all sets ≤ 7.0 at band top → the increment fires (same single increment
 *    the reps rule would give — RPE accelerates, never exceeds);
 *  - RPE ≥ 9.5 two consecutive sessions on the lift → 5% deload off the last
 *    top weight (same math as the −2-reps deload; idempotent, never stacks).
 */
import type { Units, WorkoutSet, MuscleGroup } from "./types.ts";
import { LOWER_BODY } from "../data/muscles.ts";
import { overloadIncrementKg } from "./units.ts";

export interface RepsBand {
  /** Band floor (e.g. 8). */
  minReps: number;
  /** Band ceiling (e.g. 12). */
  maxReps: number;
}

export interface DoubleProgressionInput {
  /** Completed working sets for ONE exercise, latest sessions grouped by
   *  workoutId (same shape `suggestNextWeight` accepts). Warmups excluded. */
  lastSets: Pick<
    WorkoutSet,
    "weightKg" | "reps" | "completed" | "createdAt" | "workoutId" | "isWarmup"
  >[];
  band: RepsBand;
  primaryMuscle: MuscleGroup;
  units: Units;
  /** Session grouping time reference (tests pass a fixed value). */
  now: number;
}

/** Round to 4 decimals (percent/deload math stability). */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Double-progression prefill for the next session. Pure; `no history` →
 * { 20 kg, band floor } (generator default preserved).
 */
export function doubleProgression(
  input: Omit<DoubleProgressionInput, "band"> & { band?: RepsBand },
): { weightKg: number; reps: number } {
  const band = input.band ?? { minReps: 8, maxReps: 12 };
  const sessions = groupBySession(input.lastSets, input.now);
  const latest = sessions[0];
  if (!latest) return { weightKg: 20, reps: band.minReps };
  const top = Math.max(...latest.sets.map((s) => s.weightKg));
  const allAtCeil = latest.sets.every((s) => s.reps >= band.maxReps);
  const allInBand = latest.sets.every(
    (s) => s.reps >= band.minReps && s.reps <= band.maxReps,
  );
  const bestReps = Math.max(...latest.sets.map((s) => s.reps));
  const inc = overloadIncrementKg(
    LOWER_BODY.has(input.primaryMuscle),
    input.units,
  );

  const rpeAdjust = rpeAdjustment(
    latest.sets as unknown as Pick<WorkoutSet, "rpe" | "reps" | "weightKg">[],
    band,
    input.lastSets,
  );
  let weightKg = top;
  let reps: number;
  if (allAtCeil && rpeAdjust !== "hold") {
    // Band ceiling cleared → one increment, reps back to floor. RPE ≤ 7
    // (rpeAdjust "accelerate") and plain reps both land here — never two.
    weightKg = round4(top + inc);
    reps = band.minReps;
  } else if (allInBand) {
    weightKg = top;
    reps = Math.min(bestReps + 1, band.maxReps);
  } else {
    // Missed the band floor: hold at floor. No reduction in this engine.
    weightKg = top;
    reps = band.minReps;
  }
  if (rpeAdjust === "deload") {
    // Two consecutive ≥9.5 top sets → 5% off the latest top weight.
    weightKg = round4(top * 0.95);
    reps = band.minReps;
  }
  return { weightKg, reps };
}

type HistSet = Pick<
  WorkoutSet,
  "weightKg" | "reps" | "completed" | "createdAt" | "workoutId" | "isWarmup"
> & { rpe?: number };

function groupBySession(
  sets: HistSet[],
  _now: number,
): { time: number; sets: HistSet[] }[] {
  const bySession = new Map<string, { time: number; sets: HistSet[] }>();
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

/**
 * RPE-driven adjustment (R14) for the next prefill. Warmups excluded by the
 * caller's grouping. Returns:
 *  - "hold": latest top set ≥ 9.5 (block the increment; percent schemes are
 *    never passed here — they stay exact);
 *  - "accelerate": all latest sets ≤ 7.0 with reps at band top;
 *  - "deload": ≥9.5 top set two consecutive sessions (same 5% math as the
 *    −2-reps deload; idempotent with it, never stacks);
 *  - null: no RPE signal.
 */
export function rpeAdjustment(
  latestSets: Pick<WorkoutSet, "rpe" | "reps" | "weightKg">[],
  band: RepsBand,
  allLastSets?: DoubleProgressionInput["lastSets"],
): "hold" | "accelerate" | "deload" | null {
  const logged = latestSets.filter((s) => typeof s.rpe === "number");
  if (logged.length === 0) return null;
  const topSet = latestSets.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
  const deload =
    topSet.rpe != null &&
    topSet.rpe >= 9.5 &&
    (previousSessionTopRpe(allLastSets) ?? 0) >= 9.5;
  if (deload) return "deload";
  if (topSet.rpe != null && topSet.rpe >= 9.5) return "hold";
  if (
    logged.length === latestSets.length &&
    logged.every((s) => s.rpe! <= 7.0) &&
    latestSets.every((s) => s.reps >= band.maxReps)
  )
    return "accelerate";
  return null;
}

/** Top-set RPE of the second-newest session (for the two-session deload). */
function previousSessionTopRpe(
  allLastSets?: HistSet[],
): number | undefined {
  if (!allLastSets) return undefined;
  const sessions = groupBySession(allLastSets, Date.now());
  const prev = sessions[1];
  if (!prev) return undefined;
  const topWeight = Math.max(...prev.sets.map((s) => s.weightKg));
  const topRpes = prev.sets
    .filter((s) => s.weightKg === topWeight && typeof s.rpe === "number")
    .map((s) => s.rpe as number);
  return topRpes.length > 0 ? Math.max(...topRpes) : undefined;
}
