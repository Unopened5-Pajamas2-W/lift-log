/** Unit vectors for suggestion + overload (spec §7) and units. */
import { describe, expect, it } from "vitest";
import {
  buildWarmupSets,
  generateWorkout,
  groupWorkingSessions,
  suggestNextWeight,
  STALE_DAYS,
} from "../../src/lib/suggest.ts";
import { displayWeight, toKg } from "../../src/lib/units.ts";
import type { Exercise, MuscleGroup } from "../../src/lib/types.ts";

function fakeExercise(
  id: string,
  primaryMuscle: MuscleGroup,
  equipment: Exercise["equipment"] = "dumbbell",
): Exercise {
  const now = Date.now();
  return {
    id,
    name: id,
    primaryMuscle,
    secondaryMuscles: [],
    equipment,
    difficulty: "beginner",
    instructions: ["Do it."],
    isCustom: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
}

const fullRecovery = Object.fromEntries(
  [
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "quads",
    "hamstrings",
    "glutes",
    "calves",
    "core",
    "fullbody",
  ].map((m) => [m, 100]),
) as Record<MuscleGroup, number>;

describe("overload", () => {
  it("completed 3x8 @60 suggests 61.25 in kg mode", () => {
    const last = [
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 8, completed: true },
    ];
    expect(suggestNextWeight(last, "chest", "kg")).toEqual({
      weightKg: 61.25,
      reps: 8,
    });
  });

  it("shortfall of 1 repeats the baseline weight", () => {
    const last = [
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 7, completed: true },
    ];
    expect(suggestNextWeight(last, "chest", "kg")).toEqual({
      weightKg: 60,
      reps: 8,
    });
  });

  it("shortfall of 2 deloads 5% (spec §7)", () => {
    const last = [
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 6, completed: true },
    ];
    expect(suggestNextWeight(last, "chest", "kg")).toEqual({
      weightKg: 57,
      reps: 8,
    });
  });

  it("lower-body clean session adds the 2.5 kg increment", () => {
    const last = [
      { weightKg: 80, reps: 5, completed: true },
      { weightKg: 80, reps: 5, completed: true },
    ];
    expect(suggestNextWeight(last, "quads", "kg")).toEqual({
      weightKg: 82.5,
      reps: 5,
    });
  });

  it("empty history starts light", () => {
    expect(suggestNextWeight([], "chest", "kg")).toEqual({
      weightKg: 20,
      reps: 8,
    });
  });
});

/** [weightKg, reps] pairs tagged with a session id + timestamp. */
function sessionSets(
  workoutId: string,
  createdAt: number,
  pairs: [number, number][],
) {
  return pairs.map(([weightKg, reps]) => ({
    weightKg,
    reps,
    completed: true,
    workoutId,
    createdAt,
  }));
}

const DAY = 86_400_000;

describe("recent-window baseline", () => {
  it("averages per-session tops over 3 sessions, ignoring a lifetime PR", () => {
    const now = Date.now();
    const last = [
      ...sessionSets("w-old-pr", now - 60 * DAY, [[100, 5]]),
      ...sessionSets("w1", now - 6 * DAY, [
        [60, 8],
        [60, 8],
      ]),
      ...sessionSets("w2", now - 3 * DAY, [
        [62.5, 8],
        [62.5, 8],
      ]),
      ...sessionSets("w3", now - 1 * DAY, [
        [65, 8],
        [65, 8],
      ]),
    ];
    // Baseline (60+62.5+65)/3 = 62.5, clean latest → +1.25.
    expect(suggestNextWeight(last, "chest", "kg", now)).toEqual({
      weightKg: 63.75,
      reps: 8,
    });
  });

  it("ignores sessions beyond the 3 most recent", () => {
    const now = Date.now();
    const last = [
      ...sessionSets("w0", now - 30 * DAY, [[200, 1]]),
      ...sessionSets("w1", now - 6 * DAY, [[60, 8]]),
      ...sessionSets("w2", now - 3 * DAY, [[62.5, 8]]),
      ...sessionSets("w3", now - 1 * DAY, [[65, 8]]),
    ];
    expect(suggestNextWeight(last, "chest", "kg", now).weightKg).toBe(63.75);
    expect(groupWorkingSessions(last)).toHaveLength(3);
  });

  it("ignores warmup-flagged sets in tops and shortfall", () => {
    const now = Date.now();
    const last = [
      {
        weightKg: 100,
        reps: 8,
        completed: true,
        workoutId: "w1",
        createdAt: now - DAY,
        isWarmup: true,
      },
      ...sessionSets("w1", now - DAY, [
        [60, 8],
        [60, 8],
      ]),
    ];
    expect(suggestNextWeight(last, "chest", "kg", now)).toEqual({
      weightKg: 61.25,
      reps: 8,
    });
  });

  it("all-warmup history starts light", () => {
    expect(
      suggestNextWeight(
        [
          {
            weightKg: 60,
            reps: 8,
            completed: true,
            workoutId: "w1",
            createdAt: Date.now(),
            isWarmup: true,
          },
        ],
        "chest",
        "kg",
      ),
    ).toEqual({ weightKg: 20, reps: 8 });
  });

  it("stale history repeats instead of progressing", () => {
    const now = Date.now();
    const stale = sessionSets("w1", now - (STALE_DAYS + 1) * DAY, [
      [60, 8],
      [60, 8],
    ]);
    expect(suggestNextWeight(stale, "chest", "kg", now)).toEqual({
      weightKg: 60,
      reps: 8,
    });
    const fresh = sessionSets("w1", now - (STALE_DAYS - 1) * DAY, [
      [60, 8],
      [60, 8],
    ]);
    expect(suggestNextWeight(fresh, "chest", "kg", now)).toEqual({
      weightKg: 61.25,
      reps: 8,
    });
  });
});

describe("warmups", () => {
  it("builds 8x60% + 3x85% rows", () => {
    expect(buildWarmupSets(60)).toEqual([
      { weightKg: 36, reps: 8, isWarmup: true },
      { weightKg: 51, reps: 3, isWarmup: true },
    ]);
    expect(buildWarmupSets(100)).toEqual([
      { weightKg: 60, reps: 8, isWarmup: true },
      { weightKg: 85, reps: 3, isWarmup: true },
    ]);
  });

  it("prepends warmups to the first item per primary muscle only", () => {
    const { items } = generateWorkout({
      durationMin: 30,
      focus: "full-body",
      equipment: ["barbell", "dumbbell", "bodyweight"],
      recovery: fullRecovery,
      library: [
        fakeExercise("bench", "chest", "barbell"),
        fakeExercise("pushup", "chest", "bodyweight"),
        fakeExercise("row", "back", "dumbbell"),
      ],
      lastPerformance: new Map(),
      lastDoneAt: new Map(),
      seed: 7,
      units: "lb",
    });
    const byMuscle = new Map<string, typeof items>();
    for (const item of items) {
      const muscle = item.exerciseId === "row" ? "back" : "chest";
      if (!byMuscle.has(muscle)) byMuscle.set(muscle, []);
      byMuscle.get(muscle)?.push(item);
    }
    for (const group of byMuscle.values()) {
      const warmed = group.filter((i) =>
        i.sets.some((s) => s.isWarmup === true),
      );
      expect(warmed).toHaveLength(1);
      const wu = warmed[0]?.sets.filter((s) => s.isWarmup === true) ?? [];
      expect(wu).toHaveLength(2);
      // New movements start at 20 kg → 12×8 + 17×3.
      expect(wu[0]).toMatchObject({ weightKg: 12, reps: 8 });
      expect(wu[1]).toMatchObject({ weightKg: 17, reps: 3 });
      // Working sets follow the warmups.
      expect(
        warmed[0]?.sets.filter((s) => s.isWarmup !== true),
      ).toHaveLength(3);
    }
  });

  it("averaged baseline shows in the explanation", () => {
    const now = Date.now();
    const last = new Map([
      [
        "bench",
        [
          ...sessionSets("w1", now - 6 * DAY, [[60, 8]]),
          ...sessionSets("w2", now - 3 * DAY, [[62.5, 8]]),
          ...sessionSets("w3", now - 1 * DAY, [[65, 8]]),
        ],
      ],
    ]);
    const { items } = generateWorkout({
      durationMin: 30,
      focus: "full-body",
      equipment: ["barbell", "dumbbell", "bodyweight"],
      recovery: fullRecovery,
      library: [
        fakeExercise("bench", "chest", "barbell"),
        fakeExercise("pushup", "chest", "bodyweight"),
        fakeExercise("row", "back", "dumbbell"),
      ],
      lastPerformance: last,
      lastDoneAt: new Map([["bench", now - DAY]]),
      seed: 7,
      units: "lb",
    });
    const bench = items.find((i) => i.exerciseId === "bench");
    expect(bench?.explanation).toContain("3-session avg");
  });
});

describe("units", () => {
  it("100 kg displays as 220.5 lb and round-trips", () => {
    expect(displayWeight(100, "lb")).toBe(220.5);
    expect(Math.abs(toKg(220.5, "lb") - 100)).toBeLessThan(0.05);
  });
});

describe("generateWorkout", () => {
  const library = [
    fakeExercise("bench", "chest", "barbell"),
    fakeExercise("pushup", "chest", "bodyweight"),
    fakeExercise("row", "back", "dumbbell"),
  ];

  it("respects equipment profile (no barbell when deselected)", () => {
    const { items } = generateWorkout({
      durationMin: 30,
      focus: "full-body",
      equipment: ["dumbbell", "bodyweight"],
      recovery: fullRecovery,
      library,
      lastPerformance: new Map(),
      lastDoneAt: new Map(),
      seed: 7,
      units: "lb",
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.exerciseId !== "bench")).toBe(true);
  });

  it("excludes fatigued muscles below 30% unless overridden", () => {
    const fatigued = { ...fullRecovery, chest: 10 };
    const strict = generateWorkout({
      durationMin: 30,
      focus: "full-body",
      equipment: ["barbell", "dumbbell", "bodyweight"],
      recovery: fatigued,
      library,
      lastPerformance: new Map(),
      lastDoneAt: new Map(),
      seed: 7,
      units: "lb",
    });
    expect(
      strict.items.every(
        (i) => i.exerciseId !== "bench" && i.exerciseId !== "pushup",
      ),
    ).toBe(true);
    const lax = generateWorkout({
      durationMin: 30,
      focus: "full-body",
      equipment: ["barbell", "dumbbell", "bodyweight"],
      recovery: fatigued,
      library,
      lastPerformance: new Map(),
      lastDoneAt: new Map(),
      seed: 7,
      units: "lb",
      allowFatigued: true,
    });
    expect(lax.items.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same seed", () => {
    const base = {
      durationMin: 30 as const,
      focus: "full-body" as const,
      equipment: ["dumbbell", "bodyweight"] as const,
      recovery: fullRecovery,
      library,
      lastPerformance: new Map(),
      lastDoneAt: new Map(),
      seed: 42,
      units: "lb" as const,
    };
    expect(generateWorkout({ ...base }).items).toEqual(
      generateWorkout({ ...base }).items,
    );
  });
});
