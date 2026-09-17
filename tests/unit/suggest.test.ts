/** Unit vectors for suggestion + overload (spec §7) and units. */
import { describe, expect, it } from "vitest";
import { generateWorkout, suggestNextWeight } from "../../src/lib/suggest.ts";
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

  it("shortfall repeats last weight", () => {
    const last = [
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 6, completed: true },
    ];
    expect(suggestNextWeight(last, "chest", "kg").weightKg).toBe(60);
  });

  it("repeated shortfall deloads 5%", () => {
    const last = [
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 4, completed: true },
    ];
    expect(suggestNextWeight(last, "chest", "kg").weightKg).toBe(57);
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
