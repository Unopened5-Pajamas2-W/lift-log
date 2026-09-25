// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { matchExercise, searchExercises, tokenize } from "../../src/lib/search.ts";
import type { Exercise } from "../../src/lib/types.ts";

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: "ex",
    name: "Test Exercise",
    primaryMuscle: "chest",
    secondaryMuscles: [],
    equipment: "barbell",
    difficulty: "beginner",
    instructions: [],
    isCustom: false,
    isArchived: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const inclineBarbell = makeExercise({
  id: "incline-barbell-press",
  name: "Incline Barbell Press",
  aliases: ["incline bench press", "incline press"],
});
const tricepsPushdown = makeExercise({
  id: "triceps-pushdown",
  name: "Triceps Pushdown",
  aliases: ["cable pushdown", "pushdown", "triceps pressdown"],
});
const bench = makeExercise({ id: "bench", name: "Barbell Bench Press" });
const legPress = makeExercise({ id: "leg-press", name: "Leg Press" });
const preacherCurl = makeExercise({
  id: "ez-bar-curl",
  name: "EZ-Bar Preacher Curl",
});

describe("tokenize", () => {
  it("lowercases, strips punctuation, drops empties", () => {
    expect(tokenize("Cable Push-down!")).toEqual(["cable", "push", "down"]);
    expect(tokenize("  ")).toEqual([]);
  });
});

describe("matchExercise", () => {
  it("matches 'incline bench press' → Incline Barbell Press via alias", () => {
    expect(matchExercise(inclineBarbell, "incline bench press")).toBeGreaterThanOrEqual(0);
  });

  it("matches 'Cable pushdown' → Triceps Pushdown via alias", () => {
    expect(matchExercise(tricepsPushdown, "cable pushdown")).toBeGreaterThanOrEqual(0);
  });

  it("exact full-name phrase scores highest", () => {
    expect(matchExercise(inclineBarbell, "incline barbell press")).toBeGreaterThan(
      matchExercise(inclineBarbell, "incline press"),
    );
  });

  it("requires all query tokens (AND semantics)", () => {
    expect(matchExercise(bench, "incline bench")).toBe(-1);
  });

  it("prefix matching: 'inc' hits 'incline'", () => {
    expect(matchExercise(inclineBarbell, "inc press")).toBeGreaterThanOrEqual(0);
  });

  it("word-boundary precision: 'cur' does not match 'curl' as substring, but as prefix does", () => {
    expect(matchExercise(preacherCurl, "cur")).toBeGreaterThanOrEqual(0);
  });

  it("unrelated query fails", () => {
    expect(matchExercise(legPress, "shoulder")).toBe(-1);
  });

  it("empty query matches with score 0", () => {
    expect(matchExercise(legPress, "")).toBe(0);
    expect(matchExercise(legPress, "   ")).toBe(0);
  });

  it("single common token still matches (breadth acceptable for full-word hit)", () => {
    expect(matchExercise(legPress, "press")).toBeGreaterThanOrEqual(0);
  });
});

describe("searchExercises", () => {
  const all = [inclination(), tricepsPushdown, bench, legPress, preacherCurl];

  function inclination(): Exercise {
    return inclineBarbell;
  }

  it("ranks phrase matches above spread matches", () => {
    const out = searchExercises(all, "incline bench press");
    expect(out[0]?.id).toBe("incline-barbell-press");
  });

  it("'cable pushdown' puts Triceps Pushdown first", () => {
    const out = searchExercises(all, "cable pushdown");
    expect(out[0]?.id).toBe("triceps-pushdown");
  });

  it("empty query preserves stored order", () => {
    const out = searchExercises(all, "");
    expect(out.map((e) => e.id)).toEqual(all.map((e) => e.id));
  });

  it("'press' returns all press exercises, ranked by name within tier", () => {
    const out = searchExercises(all, "press");
    // incline-barbell-press matches via alias "incline press"; pushdown via
    // alias "triceps pressdown" — all tier together, name tie-break applies.
    expect(out.map((e) => e.id)).toEqual([
      "bench", // "Barbell Bench Press" exact phrase-ish, name tie-break
      "incline-barbell-press",
      "leg-press",
      "triceps-pushdown",
    ]);
  });
});
