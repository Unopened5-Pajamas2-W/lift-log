/** Hand-computed vectors for the pure analytics core (spec §7.1). */
import { describe, expect, it } from "vitest";
import {
  consistencyStats,
  exerciseSessionPoints,
  muscleSplit,
  repMaxLadder,
  weekKey,
  windowCutoff,
} from "../../src/lib/analytics.ts";
import type { Exercise, Workout, WorkoutSet } from "../../src/lib/types.ts";

/** Minimal workout fixture (only fields analytics reads). */
function w(id: string, startedAt: number, status: Workout["status"] = "completed"): Workout {
  return { id, startedAt, status, title: id };
}

/** Minimal set fixture. */
function s(
  id: string,
  workoutId: string,
  weightKg: number,
  reps: number,
  extra: Partial<WorkoutSet> = {},
): WorkoutSet {
  return {
    id,
    workoutId,
    exerciseId: "squat",
    order: 0,
    weightKg,
    reps,
    completed: true,
    createdAt: 0,
    ...extra,
  };
}

/** Minimal exercise fixture. */
function e(id: string, primaryMuscle: Exercise["primaryMuscle"]): Exercise {
  return {
    id,
    name: id,
    primaryMuscle,
    secondaryMuscles: [],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [],
    isCustom: false,
    isArchived: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("windowCutoff", () => {
  const now = Date.UTC(2026, 8, 18, 12);
  it("maps range keys to epoch cutoffs", () => {
    expect(windowCutoff("3M", now)).toBe(now - 90 * 86_400_000);
    expect(windowCutoff("6M", now)).toBe(now - 180 * 86_400_000);
    expect(windowCutoff("1Y", now)).toBe(now - 365 * 86_400_000);
    expect(windowCutoff("30d", now)).toBe(now - 30 * 86_400_000);
    expect(windowCutoff("90d", now)).toBe(now - 90 * 86_400_000);
  });
  it("returns null for All", () => {
    expect(windowCutoff("All", now)).toBeNull();
  });
});

describe("exerciseSessionPoints", () => {
  it("joins sets to completed workouts and excludes warmups/incomplete/discarded", () => {
    const sets = [
      s("a1", "w1", 60, 8, { isWarmup: true }), // warmup → excluded
      s("a2", "w1", 100, 5), // best: 100×(1+5/30)
      s("a3", "w1", 90, 6, { completed: false }), // incomplete → excluded
      s("b1", "w2", 120, 3), // 120×1.1 = 132
      s("b2", "w2", 0, 10), // bodyweight → 0 e1RM, 0 volume
      s("c1", "w3", 200, 1), // discarded workout → no point
    ];
    const workouts = [w("w1", 1000), w("w2", 2000), w("w3", 3000, "discarded")];
    const points = exerciseSessionPoints(sets, workouts);
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ workoutId: "w1", t: 1000 });
    expect(points[0]?.bestE1rmKg).toBeCloseTo(100 * (1 + 5 / 30), 5);
    expect(points[0]?.volumeKg).toBe(500);
    expect(points[1]).toMatchObject({
      workoutId: "w2",
      t: 2000,
      volumeKg: 360,
    });
    expect(points[1]?.bestE1rmKg).toBeCloseTo(132, 5);
  });

  it("keeps a completed session with no qualifying sets as a 0/0 point", () => {
    const points = exerciseSessionPoints(
      [s("a1", "w1", 60, 8, { isWarmup: true })],
      [w("w1", 1000)],
    );
    expect(points).toEqual([
      { workoutId: "w1", t: 1000, bestE1rmKg: 0, volumeKg: 0 },
    ]);
  });

  it("sorts by startedAt, tie-breaking by workoutId for stable output", () => {
    const sets = [s("b1", "wb", 50, 5), s("a1", "wa", 50, 5)];
    const workouts = [w("wb", 1000), w("wa", 1000)];
    const points = exerciseSessionPoints(sets, workouts);
    expect(points.map((p) => p.workoutId)).toEqual(["wa", "wb"]);
  });
});

describe("repMaxLadder", () => {
  it("finds the heaviest completed working set per exact rep target", () => {
    const sets = [
      s("a", "w1", 100, 5),
      s("b", "w2", 102.5, 5), // heavier → wins
      s("c", "w3", 60, 8, { isWarmup: true }), // warmup → ignored
      s("d", "w4", 140, 8, { completed: false }), // incomplete → ignored
      s("e", "w5", 120, 3),
    ];
    const rows = repMaxLadder(sets);
    expect(rows.map((r) => r.targetReps)).toEqual([1, 3, 5, 8, 10, 12]);
    expect(rows.find((r) => r.targetReps === 5)?.weightKg).toBe(102.5);
    expect(rows.find((r) => r.targetReps === 5)?.e1rmKg).toBeCloseTo(
      102.5 * (1 + 5 / 30),
      5,
    );
    expect(rows.find((r) => r.targetReps === 3)?.weightKg).toBe(120);
    expect(rows.find((r) => r.targetReps === 1)?.weightKg).toBeNull();
    expect(rows.find((r) => r.targetReps === 12)?.weightKg).toBeNull();
  });

  it("breaks weight ties by latest createdAt", () => {
    const rows = repMaxLadder([
      s("early", "w1", 100, 5, { createdAt: 1000 }),
      s("late", "w2", 100, 5, { createdAt: 9000 }),
    ]);
    expect(rows.find((r) => r.targetReps === 5)?.weightKg).toBe(100);
    expect(rows.find((r) => r.targetReps === 5)?.achievedAt).toBe(9000);
  });

  it("counts addedWeightKg toward the effective weight", () => {
    const rows = repMaxLadder(
      [s("a", "w1", 0, 5, { addedWeightKg: 25 })],
      [5],
    );
    expect(rows[0]?.weightKg).toBe(25);
    expect(rows[0]?.e1rmKg).toBeCloseTo(25 * (1 + 5 / 30), 5);
  });

  it("honors custom targets and the 30-rep e1RM cap", () => {
    const rows = repMaxLadder([s("a", "w1", 60, 40)], [40]);
    expect(rows[0]?.weightKg).toBe(60);
    expect(rows[0]?.e1rmKg).toBeCloseTo(60 * (1 + 30 / 30), 5); // capped at 30
  });
});

describe("muscleSplit", () => {
  const library = new Map(
    [
      e("squat", "quads"),
      e("bench", "chest"),
      e("curl", "biceps"),
    ].map((x) => [x.id, x]),
  );
  const mk = (
    id: string,
    exerciseId: string,
    weightKg: number,
    reps: number,
    createdAt: number,
  ): WorkoutSet => s(id, "w1", weightKg, reps, { exerciseId, createdAt });

  it("aggregates completed working-set volume by primary muscle, sorted desc", () => {
    const sets = [
      mk("1", "squat", 100, 5, 100), // 500
      mk("2", "squat", 50, 5, 200), // 250
      mk("3", "bench", 60, 10, 150), // 600
      mk("4", "curl", 15, 10, 300), // 150
      s("5", "w1", 100, 5, { exerciseId: "squat", createdAt: 400, isWarmup: true }), // warmup → excluded
      mk("6", "ghost", 100, 5, 500), // unresolvable → dropped
    ];
    const rows = muscleSplit(sets, library, null);
    expect(rows.map((r) => r.muscle)).toEqual(["quads", "chest", "biceps"]);
    expect(rows[0]).toMatchObject({ volumeKg: 750, share: 0.5 });
    expect(rows[1]).toMatchObject({ volumeKg: 600, share: 0.4 });
    expect(rows[2]).toMatchObject({ volumeKg: 150, share: 0.1 });
  });

  it("drops sets outside the absolute window cutoff", () => {
    const sets = [
      mk("1", "squat", 100, 5, 100), // old
      mk("2", "bench", 60, 10, 9000), // in window
    ];
    const rows = muscleSplit(sets, library, 5000);
    expect(rows).toEqual([{ muscle: "chest", volumeKg: 600, share: 1 }]);
  });

  it("returns an empty list when there is no weighted volume", () => {
    const sets = [mk("1", "squat", 0, 10, 100), mk("2", "ghost", 50, 5, 100)];
    expect(muscleSplit(sets, library, null)).toEqual([]);
  });
});

describe("weekKey", () => {
  it("anchors weeks on local Monday", () => {
    expect(weekKey(new Date(2026, 8, 14).getTime())).toBe("2026-09-14"); // Mon
    expect(weekKey(new Date(2026, 8, 18).getTime())).toBe("2026-09-14"); // Fri
    expect(weekKey(new Date(2026, 8, 13).getTime())).toBe("2026-09-07"); // Sun
  });

  it("crosses month and year boundaries on date components", () => {
    expect(weekKey(new Date(2026, 11, 29).getTime())).toBe("2026-12-28");
    expect(weekKey(new Date(2026, 11, 31).getTime())).toBe("2026-12-28");
    expect(weekKey(new Date(2027, 0, 3).getTime())).toBe("2026-12-28"); // Sun
    expect(weekKey(new Date(2027, 0, 4).getTime())).toBe("2027-01-04"); // Mon
  });

  it("survives a DST-transition week (US fallback Nov 1 2026)", () => {
    expect(weekKey(new Date(2026, 9, 31).getTime())).toBe("2026-10-26");
    expect(weekKey(new Date(2026, 10, 1).getTime())).toBe("2026-10-26"); // Sun
    expect(weekKey(new Date(2026, 10, 2).getTime())).toBe("2026-11-02"); // Mon
  });
});

describe("consistencyStats", () => {
  // Local wall-clock dates (analytics is local-time by design).
  const d = (y: number, m: number, day: number, h = 9): number =>
    new Date(y, m, day, h).getTime();

  it("counts streaks, 30-day sessions, and trailing-8-week average", () => {
    const starts = [
      d(2026, 0, 5), // Mon
      d(2026, 0, 7), // Wed
      d(2026, 0, 12), // Mon
      d(2026, 0, 21), // Wed
    ];
    // Current week (Mon Jan 19) has a workout → no grace walk-back.
    const stats = consistencyStats(starts, d(2026, 0, 22));
    expect(stats.currentWeekStreak).toBe(3); // Jan 5, 12, 19 weeks
    expect(stats.bestWeekStreak).toBe(3);
    expect(stats.sessionsLast30Days).toBe(4);
    expect(stats.avgSessionsPerWeek8w).toBe(0.4); // 3 workouts / 8 weeks
  });

  it("graces an in-progress empty week instead of resetting the streak", () => {
    const starts = [
      d(2026, 0, 5),
      d(2026, 0, 7),
      d(2026, 0, 12),
      d(2026, 0, 21),
    ];
    const stats = consistencyStats(starts, d(2026, 0, 27)); // Tue of empty week
    expect(stats.currentWeekStreak).toBe(3);
  });

  it("resets the current streak once a full week is empty", () => {
    const starts = [
      d(2026, 0, 5),
      d(2026, 0, 7),
      d(2026, 0, 12),
      d(2026, 0, 21),
    ];
    const stats = consistencyStats(starts, d(2026, 1, 9)); // Mon of week 2 later
    expect(stats.currentWeekStreak).toBe(0);
    expect(stats.bestWeekStreak).toBe(3);
  });

  it("bounds the 30-day window and excludes the current week from the 8w average", () => {
    const starts = [d(2026, 0, 5), d(2026, 0, 21), d(2026, 0, 22, 6)];
    // Mon Jan 19 week is the current week: Jan 22 workouts are excluded from
    // the trailing-8-full-weeks average but count in the streak.
    const stats = consistencyStats(starts, d(2026, 0, 22, 12));
    expect(stats.avgSessionsPerWeek8w).toBe(0.1); // only Jan 5 in window
    expect(stats.currentWeekStreak).toBe(1);
    expect(stats.sessionsLast30Days).toBe(3); // cutoff Dec 23 includes Jan 5
  });

  it("handles an empty history", () => {
    const stats = consistencyStats([], d(2026, 8, 18));
    expect(stats).toEqual({
      currentWeekStreak: 0,
      bestWeekStreak: 0,
      sessionsLast30Days: 0,
      avgSessionsPerWeek8w: 0,
    });
  });
});
