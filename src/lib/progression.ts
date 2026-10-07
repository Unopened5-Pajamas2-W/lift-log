/**
 * Autoregulated double progression engine (doc §6.3, §2.3). Pure — no IO,
 * no implicit Date.now; callers own time so vectors stay deterministic.
 *
 * Semantics: reps band [floor, ceil], driven by the FIRST working set of the
 * latest session (PYR §L3: remaining sets ride the same load set by set 1):
 *  - set 1 at band top with RPE ≤ rpeCeiling (default 8 = 2 RIR) → +one
 *    increment, reps reset to floor (an easy RPE ≤ 7 lands on the same
 *    single increment — accelerate, never a double jump);
 *  - set 1 inside the band → hold weight, reps = min(set1 + 1, ceil);
 *  - set 1 below the floor by k reps → load × (1 − 4%·k) (§2.3 miss
 *    correction: 2 RIR off ≈ 8%);
 *  - every set at the floor with RPE ≥ 9 (≤1 RIR grind) → one step back (−5%);
 *  - any later set below the floor → hold weight at floor reps (no
 *    correction — the load stands, the lifter retries).
 *
 * RPE valves (warmups and unlogged sets excluded; unchanged from R14):
 *  - top-set RPE ≥ 9.5 → hold weight (absolute brake, even a high ceiling);
 *  - top-set RPE ≥ 9.5 two consecutive sessions → 5% deload off the last top
 *    weight (idempotent with the other step-backs, never stacks).
 *
 * This engine never reduces below what the rules above state; percent
 * prescriptions never pass through here.
 */
import type { Units, WorkoutSet, MuscleGroup } from "./types.ts";
import { LOWER_BODY } from "../data/muscles.ts";
import { overloadIncrementKg, round4 } from "./units.ts";
import { groupBySession as groupSessions, lastTopRpe } from "./metrics.ts";

export interface RepsBand {
  /** Band floor (e.g. 8). */
  minReps: number;
  /** Band ceiling (e.g. 12). */
  maxReps: number;
}

export interface DoubleProgressionInput {
  /** Completed working sets for ONE exercise, latest sessions grouped by
   *  workoutId (same shape `suggestNextWeight` accepts). Warmups excluded. */
  lastSets: (Pick<
    WorkoutSet,
    "weightKg" | "reps" | "completed" | "createdAt" | "workoutId" | "isWarmup" | "rpe"
  > & { order?: number })[];
  band: RepsBand;
  primaryMuscle: MuscleGroup;
  units: Units;
  /** Session grouping time reference (tests pass a fixed value). */
  now: number;
  /** RPE ceiling for advancing (§6.3 RIR ceiling). Default 8. */
  rpeCeiling?: number;
}

/**
 * Double-progression prefill for the next session. Pure; no history →
 * { 20 kg, band floor } (generator default preserved).
 */
export function doubleProgression(
  input: Omit<DoubleProgressionInput, "band"> & { band?: RepsBand },
): { weightKg: number; reps: number } {
  const band = input.band ?? { minReps: 8, maxReps: 12 };
  const ceiling = input.rpeCeiling ?? 8;
  const sessions = groupSessions(input.lastSets);
  const latest = sessions[0];
  if (!latest) return { weightKg: 20, reps: band.minReps };
  const top = Math.max(...latest.sets.map((s) => s.weightKg));
  const inc = overloadIncrementKg(
    LOWER_BODY.has(input.primaryMuscle),
    input.units,
  );

  const rpeAdjust = rpeAdjustment(latest.sets, band, input.lastSets);
  if (rpeAdjust === "deload") {
    // Two consecutive ≥9.5 top sets → 5% off the latest top weight.
    return { weightKg: round4(top * 0.95), reps: band.minReps };
  }

  const set1 = firstWorkingSet(latest.sets);
  const missK = Math.max(0, band.minReps - set1.reps);
  if (missK > 0) {
    // Set-1 miss → ~4% per rep short (§2.3; 2 RIR off ≈ 8%).
    return { weightKg: round4(top * (1 - 0.04 * missK)), reps: band.minReps };
  }

  const grinding =
    latest.sets.length > 0 &&
    latest.sets.every(
      (s) =>
        s.reps === band.minReps &&
        typeof s.rpe === "number" &&
        s.rpe >= 9,
    );
  if (grinding) {
    // All sets grinding at ≤1 RIR at band bottom → one step back (~4–6%).
    return { weightKg: round4(top * 0.95), reps: band.minReps };
  }

  const set1Rpe = set1.rpe;
  const withinCeiling = set1Rpe == null || set1Rpe <= ceiling;
  if (set1.reps >= band.maxReps && withinCeiling && rpeAdjust !== "hold") {
    // Band top cleared inside the RIR ceiling → one increment, reps to floor.
    return { weightKg: round4(top + inc), reps: band.minReps };
  }

  const anyBelowFloor = latest.sets.some((s) => s.reps < band.minReps);
  const reps = anyBelowFloor
    ? band.minReps
    : Math.min(set1.reps + 1, band.maxReps);
  return { weightKg: top, reps };
}

/** One session's set shape: working rows with optional order and RPE. */
type HistSet = Pick<
  WorkoutSet,
  "weightKg" | "reps" | "completed" | "createdAt" | "workoutId" | "isWarmup" | "rpe"
> & { order?: number };

/** First working set of a session: lowest `order` when every set has one,
 *  else array order (legacy vectors carry no order). */
function firstWorkingSet(sets: HistSet[]): HistSet {
  if (!sets.every((s) => s.order != null)) return sets[0]!;
  return sets.reduce((a, b) => (b.order! < a.order! ? b : a));
}

/**
 * RPE-driven adjustment (R14) for the next prefill. Warmups excluded by the
 * caller's grouping. Returns:
 *  - "hold": latest top set ≥ 9.5 (block the increment; percent schemes are
 *    never passed here — they stay gauge-driven);
 *  - "accelerate": all latest sets ≤ 7.0 with reps at band top;
 *  - "deload": ≥9.5 top set two consecutive sessions (same 5% math as the
 *    grind step-back; idempotent with it, never stacks);
 *  - null: no RPE signal.
 */
export function rpeAdjustment(
  latestSets: Pick<WorkoutSet, "rpe" | "reps" | "weightKg">[],
  band: RepsBand,
  allLastSets?: HistSet[],
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
function previousSessionTopRpe(allLastSets?: HistSet[]): number | undefined {
  if (!allLastSets) return undefined;
  const prev = groupSessions(allLastSets)[1];
  return prev ? lastTopRpe(prev.sets) : undefined;
}
