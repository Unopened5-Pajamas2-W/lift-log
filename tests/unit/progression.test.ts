/** Unit vectors for double progression + RPE adjustments (v2 spec §7.1). */
import { describe, expect, it } from "vitest";
import {
  doubleProgression,
  rpeAdjustment,
} from "../../src/lib/progression.ts";
import type { WorkoutSet } from "../../src/lib/types.ts";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const BAND = { minReps: 8, maxReps: 12 };

function set(
  weightKg: number,
  reps: number,
  opts: Partial<
    Pick<WorkoutSet, "rpe" | "completed" | "isWarmup" | "workoutId" | "createdAt">
  > = {},
): Pick<
  WorkoutSet,
  "weightKg" | "reps" | "completed" | "createdAt" | "workoutId" | "isWarmup" | "rpe"
> {
  return {
    weightKg,
    reps,
    completed: true,
    workoutId: "w1",
    createdAt: NOW - DAY,
    ...opts,
  };
}

function dp(
  lastSets: ReturnType<typeof set>[],
  opts: { band?: { minReps: number; maxReps: number }; muscle?: "chest" | "quads" } = {},
) {
  return doubleProgression({
    lastSets,
    band: opts.band ?? BAND,
    primaryMuscle: opts.muscle ?? "chest",
    units: "kg",
    now: NOW,
  });
}

describe("double progression (R12)", () => {
  it("band 8→12: 3×8 all at floor → same weight, 9 reps", () => {
    expect(
      dp([set(60, 8), set(60, 8), set(60, 8)]),
    ).toEqual({ weightKg: 60, reps: 9 });
  });

  it("3×12 at band top → +increment, reps reset to floor", () => {
    expect(
      dp([set(60, 12), set(60, 12), set(60, 12)]),
    ).toEqual({ weightKg: 61.25, reps: 8 });
  });

  it("lower-body lift uses the 2.5 kg increment", () => {
    expect(
      dp([set(80, 12), set(80, 12)], { muscle: "quads" }),
    ).toEqual({ weightKg: 82.5, reps: 8 });
  });

  it("mid-band mixed session → hold weight, min(best+1, ceil)", () => {
    expect(
      dp([set(60, 10), set(60, 9), set(60, 12)]),
    ).toEqual({ weightKg: 60, reps: 12 });
  });

  it("best already at ceil but one set short → hold, reps capped at ceil", () => {
    expect(
      dp([set(60, 12), set(60, 8)]),
    ).toEqual({ weightKg: 60, reps: 12 });
  });

  it("a set below the floor holds weight at floor (no reduction)", () => {
    expect(
      dp([set(60, 8), set(60, 7), set(60, 8)]),
    ).toEqual({ weightKg: 60, reps: 8 });
  });

  it("no history → 20 kg at band floor", () => {
    expect(dp([])).toEqual({ weightKg: 20, reps: 8 });
  });

  it("uses only the latest session (older sessions ignored)", () => {
    const old = set(60, 12, { workoutId: "w0", createdAt: NOW - 7 * DAY });
    const latest = [set(62.5, 9), set(62.5, 9)];
    expect(dp([...latest, old])).toEqual({ weightKg: 62.5, reps: 10 });
  });

  it("warmups never drive progression", () => {
    const latest = [
      set(36, 8, { isWarmup: true }),
      set(51, 3, { isWarmup: true }),
      set(60, 12),
      set(60, 12),
    ];
    expect(dp(latest)).toEqual({ weightKg: 61.25, reps: 8 });
  });

  it("incomplete sets are excluded from session evaluation", () => {
    const latest = [set(60, 12), { ...set(60, 12), completed: false }];
    expect(dp(latest)).toEqual({ weightKg: 61.25, reps: 8 });
  });

  it("custom band 5→8 from the scheme", () => {
    const band = { minReps: 5, maxReps: 8 };
    expect(
      dp([set(100, 8), set(100, 8)], { band }),
    ).toEqual({ weightKg: 101.25, reps: 5 });
  });
});

describe("RPE adjustments (R14)", () => {
  it("top set RPE ≥ 9.5 at band top → hold weight (R14a)", () => {
    expect(
      dp([set(60, 12, { rpe: 9.5 }), set(60, 12, { rpe: 9 })]),
    ).toEqual({ weightKg: 60, reps: 12 });
  });

  it("RPE ≥ 9.5 blocks the increment even though reps cleared the band", () => {
    const sets = [set(60, 12, { rpe: 10 })];
    expect(rpeAdjustment(sets, BAND)).toBe("hold");
  });

  it("all sets ≤ 7.0 with reps at band top → increment fires (R14b)", () => {
    expect(
      dp([set(60, 12, { rpe: 7 }), set(60, 12, { rpe: 6.5 })]),
    ).toEqual({ weightKg: 61.25, reps: 8 });
    expect(rpeAdjustment([set(60, 12, { rpe: 7 })], BAND)).toBe("accelerate");
  });

  it("RPE ≤ 7 but reps below band top → no increment", () => {
    expect(rpeAdjustment([set(60, 9, { rpe: 6 })], BAND)).toBeNull();
  });

  it("no RPE logged → null adjustment", () => {
    expect(rpeAdjustment([set(60, 12)], BAND)).toBeNull();
  });

  it("warmup RPEs never influence the adjustment", () => {
    const latest = [
      set(36, 8, { isWarmup: true, rpe: 10 }),
      set(60, 12),
      set(60, 12),
    ];
    // No logged RPE on working sets → no hold.
    expect(
      dp(latest),
    ).toEqual({ weightKg: 61.25, reps: 8 });
  });

  it("two consecutive ≥9.5 top sets → 5% deload (R14c)", () => {
    const lastSets = [
      ...prevSession([[60, 12, 9.5]], 1),
      ...latestSession([[60, 12, 9.5]]),
    ];
    expect(
      doubleProgression({
        lastSets,
        band: BAND,
        primaryMuscle: "chest",
        units: "kg",
        now: NOW,
      }),
    ).toEqual({ weightKg: 57, reps: 8 });
  });

  it("deload is idempotent with the −2-reps deload — no stacking", () => {
    // Latest session: RPE 9.5 AND a −2 rep shortfall. Both valves suggest 5%;
    // result must be a single 5% cut, not 9.75%.
    const lastSets = [
      ...prevSession([[60, 12, 9.5]], 1),
      ...latestSession([[60, 12, 9.5]]),
      ...latestSession([[60, 6]]),
    ];
    const out = doubleProgression({
      lastSets: [
        ...prevSession([[60, 12, 9.5]], 1),
        ...latestSession([[60, 12, 9.5]]),
        { ...set(60, 6), workoutId: "w-latest", createdAt: NOW - DAY },
      ],
      band: BAND,
      primaryMuscle: "chest",
      units: "kg",
      now: NOW,
    });
    expect(out.weightKg).toBe(57);
    expect(lastSets.length).toBeGreaterThan(0);
  });

  it("one ≥9.5 session followed by a clean one → no deload", () => {
    const lastSets = [
      ...prevSession([[60, 12, 9.5]], 2),
      ...latestSession([[60, 12, 7]]),
    ];
    expect(
      doubleProgression({
        lastSets,
        band: BAND,
        primaryMuscle: "chest",
        units: "kg",
        now: NOW,
      }),
    ).toEqual({ weightKg: 61.25, reps: 8 });
  });
});

/** Session helper with per-set RPE: [weight, reps, rpe]. */
function latestSession(pairs: [number, number, number?][]):
  ReturnType<typeof set>[] {
  return pairs.map(([w, r, rpe]) => set(w, r, { rpe, workoutId: "w-latest" }));
}
function prevSession(pairs: [number, number, number?][], daysAgo: number):
  ReturnType<typeof set>[] {
  return pairs.map(([w, r, rpe]) =>
    set(w, r, { rpe, workoutId: "w-prev", createdAt: NOW - daysAgo * DAY }),
  );
}
