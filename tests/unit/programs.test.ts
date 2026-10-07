/** Program vectors: slot resolution (first incomplete slot, never skip),
 *  cycle counting, clamp on mid-cycle edits, scheme resolution (bands,
 *  anchors, RPE corrections), phase transforms, volume meter, checks. */
import { describe, expect, it } from "vitest";
import {
  duplicateProgram,
  expandProgramDay,
  fractionalVolume,
  nextProgramSession,
  phaseVolumeScale,
  programChecks,
  programSlots,
  resolveProgramItem,
  rpeLoadCorrectionPct,
} from "../../src/lib/programs.ts";
import type {
  Exercise,
  Program,
  ProgramDay,
  ProgramItem,
  Workout,
} from "../../src/lib/types.ts";
import type { ExpandContext } from "../../src/lib/programs.ts";

function fakeExercise(
  id: string,
  primary: Exercise["primaryMuscle"],
  secondary: Exercise["secondaryMuscles"] = [],
): Exercise {
  return {
    id,
    name: id,
    primaryMuscle: primary,
    secondaryMuscles: secondary,
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [],
    isCustom: false,
    isArchived: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

const EXERCISES = new Map<string, Exercise>([
  ["ex", fakeExercise("ex", "chest")],
  ["squat", fakeExercise("squat", "quads", ["glutes", "hamstrings"])],
  ["bench", fakeExercise("bench", "chest", ["triceps", "shoulders"])],
  ["legext", fakeExercise("legext", "quads")],
  ["row", fakeExercise("row", "back")],
]);

function ctx(overrides: Partial<ExpandContext> = {}): ExpandContext {
  return { units: "kg", exerciseById: EXERCISES, ...overrides };
}

function makeProgram(
  weeks: number,
  daysPerWeek: number,
): Program {
  return {
    id: "p1",
    name: "Test",
    weeks: Array.from({ length: weeks }, (_, w) => ({
      label: `Week ${w + 1}`,
      days: Array.from({ length: daysPerWeek }, (_, d) => ({
        name: `Day ${d + 1}`,
        items: [{ exerciseId: "ex" }],
      })),
    })),
    createdAt: 0,
    updatedAt: 0,
  };
}

function doneWorkout(
  id: string,
  programId: string | undefined,
  week: number | undefined,
  day: number | undefined,
): Workout {
  return {
    id,
    title: "t",
    startedAt: 1,
    status: "completed",
    endedAt: 2,
    programId,
    programWeek: week,
    programDayIndex: day,
  };
}

describe("programSlots", () => {
  it("flattens weeks × days in sequence order", () => {
    const slots = programSlots(makeProgram(2, 3));
    expect(slots).toEqual([
      { weekIndex: 0, dayIndex: 0 },
      { weekIndex: 0, dayIndex: 1 },
      { weekIndex: 0, dayIndex: 2 },
      { weekIndex: 1, dayIndex: 0 },
      { weekIndex: 1, dayIndex: 1 },
      { weekIndex: 1, dayIndex: 2 },
    ]);
  });
});

describe("nextProgramSession", () => {
  it("starts at week 1 day 1 with no history", () => {
    const s = nextProgramSession(makeProgram(4, 3), []);
    expect(s).toEqual({
      weekIndex: 0,
      dayIndex: 0,
      cycleCount: 0,
      cycleComplete: false,
    });
  });

  it("advances to the next slot in sequence", () => {
    const p = makeProgram(4, 3);
    const s = nextProgramSession(p, [
      doneWorkout("w1", p.id, 0, 0),
      doneWorkout("w2", p.id, 0, 1),
    ]);
    expect(s.weekIndex).toBe(0);
    expect(s.dayIndex).toBe(2);
    expect(s.cycleComplete).toBe(false);
  });

  it("never skips days when workouts are out of order (locked edge case)", () => {
    const p = makeProgram(4, 3);
    // Spec §7.1 vector: day 2 done, day 1 missing → next is day 1 (1-indexed
    // (1,0) = 0-based week 0, day 0), even though a later slot was completed.
    const s = nextProgramSession(p, [
      doneWorkout("w1", p.id, 0, 1),
      doneWorkout("w2", p.id, 1, 0),
    ]);
    expect(s).toEqual({
      weekIndex: 0,
      dayIndex: 0,
      cycleCount: 0,
      cycleComplete: false,
    });
  });

  it("wraps after the last day and increments the cycle", () => {
    const p = makeProgram(2, 2);
    const s = nextProgramSession(p, [
      doneWorkout("a", p.id, 1, 0),
      doneWorkout("b", p.id, 1, 1),
      doneWorkout("c", p.id, 0, 0),
      doneWorkout("d", p.id, 0, 1),
    ]);
    expect(s).toEqual({
      weekIndex: 0,
      dayIndex: 0,
      cycleCount: 1,
      cycleComplete: true,
    });
  });

  it("cycle count keeps climbing across repeated cycles", () => {
    const p = makeProgram(2, 2);
    const s = nextProgramSession(p, [
      doneWorkout("a", p.id, 1, 0),
      doneWorkout("b", p.id, 1, 1),
      doneWorkout("c", p.id, 0, 0),
      doneWorkout("d", p.id, 0, 1),
      doneWorkout("e", p.id, 1, 0),
      doneWorkout("f", p.id, 1, 1),
      doneWorkout("g", p.id, 0, 0),
      doneWorkout("h", p.id, 0, 1),
    ]);
    expect(s.cycleCount).toBe(2);
  });

  it("ignores other programs' and non-completed workouts", () => {
    const p = makeProgram(2, 2);
    const s = nextProgramSession(p, [
      doneWorkout("x", "other", 1, 1),
      {
        ...doneWorkout("y", p.id, 0, 0),
        status: "active",
      } as Workout,
    ]);
    expect(s.weekIndex).toBe(0);
    expect(s.dayIndex).toBe(0);
  });

  it("clamps to bounds when the program shrunk mid-cycle (locked edge case)", () => {
    const p = makeProgram(2, 2);
    // History references slots beyond the new bounds via direct slots; the
    // resolver treats unmatched slot refs as no-ops → starts fresh.
    const s = nextProgramSession(p, [
      doneWorkout("a", p.id, 5, 9),
      doneWorkout("b", p.id, 0, 0),
    ]);
    // (0,0) is completed and in-bounds → next slot is (0,1).
    expect(s).toEqual({
      weekIndex: 0,
      dayIndex: 1,
      cycleCount: 0,
      cycleComplete: false,
    });
  });
});

describe("rpeLoadCorrectionPct (§2.3 chart)", () => {
  it("in-band → 0; above → −4%/RPE; below → +4%/RPE", () => {
    const band = { min: 6, max: 8 };
    expect(rpeLoadCorrectionPct(6, band)).toBe(0);
    expect(rpeLoadCorrectionPct(7.5, band)).toBe(0);
    expect(rpeLoadCorrectionPct(8, band)).toBe(0);
    expect(rpeLoadCorrectionPct(8.5, band)).toBe(-2);
    expect(rpeLoadCorrectionPct(9, band)).toBe(-4);
    expect(rpeLoadCorrectionPct(9.5, band)).toBe(-6);
    expect(rpeLoadCorrectionPct(10, band)).toBe(-8);
    expect(rpeLoadCorrectionPct(5, band)).toBe(4);
    expect(rpeLoadCorrectionPct(4, band)).toBe(8);
  });
});

describe("resolveProgramItem", () => {
  it("returns null for scheme-less items (engine decides)", () => {
    expect(resolveProgramItem({ exerciseId: "ex" }, ctx())).toBeNull();
  });

  it("expands sets-reps with a fixed weight", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: { kind: "sets-reps", sets: 3, reps: 5, weightKg: 60 },
      },
      ctx(),
    );
    expect(item?.sets).toEqual([
      { weightKg: 60, reps: 5 },
      { weightKg: 60, reps: 5 },
      { weightKg: 60, reps: 5 },
    ]);
  });

  it("sets-reps without a fixed weight uses the engine suggestion", () => {
    const item = resolveProgramItem(
      { exerciseId: "ex", scheme: { kind: "sets-reps", sets: 2, reps: 8 } },
      ctx({ engineSuggest: () => ({ weightKg: 42.5, reps: 8 }) }),
    );
    expect(item?.sets).toEqual([
      { weightKg: 42.5, reps: 8 },
      { weightKg: 42.5, reps: 8 },
    ]);
  });

  it("sets-reps without a fixed weight or engine degrades to null", () => {
    expect(
      resolveProgramItem(
        { exerciseId: "ex", scheme: { kind: "sets-reps", sets: 2, reps: 8 } },
        ctx(),
      ),
    ).toBeNull();
  });

  it("percent math is exact multiplication of the training max", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: {
          kind: "percent",
          sets: [
            { pct: 0.65, reps: 5 },
            { pct: 0.75, reps: 5 },
            { pct: 0.85, reps: 5 },
          ],
        },
        trainingMaxKg: 100,
      },
      ctx(),
    );
    expect(item?.sets).toEqual([
      { weightKg: 65, reps: 5 },
      { weightKg: 75, reps: 5 },
      { weightKg: 85, reps: 5 },
    ]);
    expect(item?.gaugePct).toBe(85);
  });

  it("percent with awkward training max rounds to 4 decimals", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: { kind: "percent", sets: [{ pct: 0.65, reps: 5 }] },
        trainingMaxKg: 92.5,
      },
      ctx(),
    );
    expect(item?.sets[0]?.weightKg).toBeCloseTo(60.125, 4);
  });

  it("percent without a training max degrades to null (engine fallback)", () => {
    expect(
      resolveProgramItem(
        { exerciseId: "ex", scheme: { kind: "percent", sets: [{ pct: 0.65, reps: 5 }] } },
        ctx(),
      ),
    ).toBeNull();
  });

  it("banded percent self-corrects the gauge load on missed RPE (§2.3)", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: {
          kind: "percent",
          sets: [{ pct: 0.8, reps: 5 }],
          rpe: { min: 6, max: 8 },
        },
        trainingMaxKg: 100,
      },
      ctx({ lastTopRpe: () => 9 }),
    );
    // Target RPE 8, logged 9 → −4% → 76.8. The stored plan stays 80 kg.
    expect(item?.sets[0]?.weightKg).toBeCloseTo(76.8, 4);
    expect(item?.rpeBand).toEqual({ min: 6, max: 8 });
    expect(item?.gaugePct).toBe(80);
  });

  it("in-band RPE leaves the gauge load untouched", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: {
          kind: "percent",
          sets: [{ pct: 0.8, reps: 5 }],
          rpe: { min: 6, max: 8 },
        },
        trainingMaxKg: 100,
      },
      ctx({ lastTopRpe: () => 7.5 }),
    );
    expect(item?.sets[0]?.weightKg).toBe(80);
  });

  it("percent-of-e1rm anchors back-offs to the running e1RM (§7.2)", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: {
          kind: "percent",
          sets: [{ pct: 0.8, reps: 4 }, { pct: 0.8, reps: 4 }],
          rpe: { min: 5, max: 8 },
          of: "e1rm",
        },
      },
      ctx({ runningE1rm: () => 140 }),
    );
    expect(item?.sets).toEqual([
      { weightKg: 112, reps: 4 },
      { weightKg: 112, reps: 4 },
    ]);
  });

  it("percent-of-e1rm falls back to the training max when no e1RM exists", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: {
          kind: "percent",
          sets: [{ pct: 0.5, reps: 3 }],
          of: "e1rm",
        },
        trainingMaxKg: 100,
      },
      ctx(),
    );
    expect(item?.sets[0]?.weightKg).toBe(50);
  });

  it("double-band schemes resolve to null without an engine suggestion", () => {
    expect(
      resolveProgramItem(
        {
          exerciseId: "ex",
          scheme: { kind: "double", sets: 3, minReps: 8, maxReps: 12 },
        },
        ctx(),
      ),
    ).toBeNull();
  });
});

describe("phase transforms (§8.3, §8.5)", () => {
  it("phaseVolumeScale: intro 0.75, deload 0.6, never stacks", () => {
    expect(phaseVolumeScale(undefined, false)).toBe(1);
    expect(phaseVolumeScale("intro", false)).toBe(0.75);
    expect(phaseVolumeScale("deload", false)).toBe(0.6);
    expect(phaseVolumeScale(undefined, true)).toBe(0.6);
    expect(phaseVolumeScale("deload", true)).toBe(0.6);
    expect(phaseVolumeScale("volume", false)).toBe(1);
  });

  it("intro scales sets-reps sets ×0.75 and eases the RPE target", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: { kind: "sets-reps", sets: 4, reps: 5, weightKg: 60, rpe: 8 },
      },
      ctx({ phase: "intro" }),
    );
    expect(item?.sets).toHaveLength(3);
    expect(item?.rpeBand).toEqual({ min: 7.5, max: 7.5 });
  });

  it("deload cuts sets but keeps loads and reps", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: { kind: "sets-reps", sets: 5, reps: 8, weightKg: 60 },
      },
      ctx({ phase: "deload" }),
    );
    expect(item?.sets).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 8 },
    ]);
  });

  it("deload slices a percent ladder from the end (heaviest drops first)", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: {
          kind: "percent",
          sets: [
            { pct: 0.65, reps: 5 },
            { pct: 0.75, reps: 5 },
            { pct: 0.85, reps: 5 },
          ],
        },
        trainingMaxKg: 100,
      },
      ctx({ phase: "deload" }),
    );
    expect(item?.sets.map((s) => s.weightKg)).toEqual([65, 75]);
  });

  it("deloadActive applies the same cut without a phase tag", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: { kind: "sets-reps", sets: 3, reps: 10, weightKg: 40 },
      },
      ctx({ deloadActive: true }),
    );
    expect(item?.sets).toHaveLength(2);
  });

  it("double-band set count scales; band floor reps hold", () => {
    const item = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: { kind: "double", sets: 4, minReps: 8, maxReps: 12 },
      },
      ctx({
        phase: "deload",
        engineSuggest: () => ({ weightKg: 42.5, reps: 8 }),
      }),
    );
    expect(item?.sets).toEqual([
      { weightKg: 42.5, reps: 8 },
      { weightKg: 42.5, reps: 8 },
    ]);
  });
});

describe("expandProgramDay (warmup ramps)", () => {
  it("prepends the §10.4 ramp to the first exercise per primary muscle", () => {
    const day: ProgramDay = {
      name: "Day",
      items: [
        { exerciseId: "squat", scheme: { kind: "sets-reps", sets: 3, reps: 5, weightKg: 100 } },
        { exerciseId: "legext", scheme: { kind: "double", sets: 2, minReps: 8, maxReps: 12 } },
        { exerciseId: "bench", scheme: { kind: "sets-reps", sets: 3, reps: 8, weightKg: 60 } },
      ],
    };
    const expanded = expandProgramDay(
      day,
      ctx({ engineSuggest: () => ({ weightKg: 40, reps: 8 }) }),
    );
    // Squat (quads) and bench (chest) open with ramps; legext (quads again) doesn't.
    expect(expanded).toHaveLength(3);
    const squat = expanded[0]!;
    const bench = expanded[2]!;
    expect(squat.sets.filter((s) => s.isWarmup === true).map((s) => s.reps)).toEqual([8, 4, 2, 1]);
    expect(squat.sets.filter((s) => s.isWarmup !== true)).toHaveLength(3);
    expect(bench.sets.filter((s) => s.isWarmup === true).map((s) => s.reps)).toEqual([5, 4, 2, 1]);
    expect(expanded[1]!.sets.every((s) => s.isWarmup !== true)).toBe(true);
  });

  it("skips items whose anchor is missing", () => {
    const day: ProgramDay = {
      name: "Day",
      items: [
        { exerciseId: "ex", scheme: { kind: "percent", sets: [{ pct: 0.65, reps: 5 }] } },
        { exerciseId: "row", scheme: { kind: "sets-reps", sets: 2, reps: 10, weightKg: 30 } },
      ],
    };
    const expanded = expandProgramDay(day, ctx());
    expect(expanded).toHaveLength(1);
    expect(expanded[0]?.exerciseId).toBe("row");
  });
});

describe("fractionalVolume (§3.1)", () => {
  it("counts 1.0 primary / 0.5 secondary, ≥4-rep sets only, plus strength sets", () => {
    const p: Program = {
      id: "p1",
      name: "T",
      weeks: [
        {
          label: "W1",
          days: [
            {
              name: "D1",
              items: [
                { exerciseId: "squat", scheme: { kind: "sets-reps", sets: 3, reps: 5 } },
                { exerciseId: "legext", scheme: { kind: "double", sets: 3, minReps: 8, maxReps: 12 } },
              ],
            },
            {
              name: "D2",
              items: [
                { exerciseId: "bench", scheme: { kind: "sets-reps", sets: 3, reps: 8 } },
                { exerciseId: "squat", scheme: { kind: "percent", sets: [{ pct: 0.8, reps: 3 }] } },
              ],
            },
          ],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    const rows = fractionalVolume(p, 0, EXERCISES);
    const quads = rows.get("quads")!;
    // D1: squat 3 + legext 3 = 6; D2: 0 (3-rep set is strength work) → 6
    expect(quads.fractional).toBeCloseTo(6, 5);
    // Strength sets: squat 3 (D1) + 1 (D2, 3-rep set) = 4
    expect(quads.strength).toBe(4);
    expect(quads.perSessionMax).toBeCloseTo(6, 5);
    // Quads appear D1 (squat+legext) and D2 (squat percent)
    expect(quads.exposures).toBe(2);
    expect(rows.get("chest")?.fractional).toBe(3);
    expect(rows.get("triceps")?.fractional).toBeCloseTo(1.5, 5);
    expect(rows.get("glutes")?.fractional).toBeCloseTo(1.5, 5);
    expect(rows.get("back")).toBeUndefined();
  });

  it("low-rep single sets don't count as fractional hypertrophy volume", () => {
    const p: Program = {
      id: "p1",
      name: "T",
      weeks: [
        {
          label: "W1",
          days: [
            {
              name: "D1",
              items: [
                { exerciseId: "ex", scheme: { kind: "percent", sets: [{ pct: 0.9, reps: 1 }] } },
              ],
            },
          ],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    const rows = fractionalVolume(p, 0, EXERCISES);
    expect(rows.get("chest")?.fractional).toBe(0);
    expect(rows.get("chest")?.strength).toBe(1);
  });
});

describe("programChecks (soft guardrails)", () => {
  it("flags >10 weekly sets/lift (hypertrophy dose) and >11 fractional in a session", () => {
    const p: Program = {
      id: "p1",
      name: "T",
      weeks: [
        {
          label: "W1",
          days: [
            {
              name: "D1",
              items: [
                // 12 sets of chest in one session: >10 weekly + >11 session cap
                { exerciseId: "bench", scheme: { kind: "sets-reps", sets: 12, reps: 8 } },
              ],
            },
          ],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    const checks = programChecks(p, EXERCISES).map((c) => c.message);
    expect(checks.some((m) => m.includes("bench") && m.includes("hypertrophy dose"))).toBe(true);
    expect(checks.some((m) => m.includes("Chest") && m.includes("cap is ~11"))).toBe(true);
    // Intentional phase tapering emits nothing.
    expect(programChecks({ ...p, weeks: [{ label: "W1", phase: "peak", days: [{ name: "D1", items: [{ exerciseId: "bench", scheme: { kind: "sets-reps", sets: 2, reps: 2 } }] }] }] }, EXERCISES)).toEqual([]);
  });

  it("a doc-aligned week produces no checks", () => {
    const p: Program = {
      id: "p1",
      name: "T",
      weeks: [
        {
          label: "W1",
          days: [
            {
              name: "D1",
              items: [
                { exerciseId: "squat", scheme: { kind: "sets-reps", sets: 2, reps: 5 } },
                { exerciseId: "bench", scheme: { kind: "sets-reps", sets: 2, reps: 5 } },
              ],
            },
            {
              name: "D2",
              items: [
                { exerciseId: "squat", scheme: { kind: "sets-reps", sets: 2, reps: 5 } },
                { exerciseId: "row", scheme: { kind: "sets-reps", sets: 4, reps: 8 } },
              ],
            },
            {
              name: "D3",
              items: [
                { exerciseId: "bench", scheme: { kind: "sets-reps", sets: 2, reps: 5 } },
                { exerciseId: "row", scheme: { kind: "sets-reps", sets: 2, reps: 8 } },
              ],
            },
          ],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    expect(programChecks(p, EXERCISES)).toEqual([]);
  });
});

/** Unit vectors for the seeded SPS program: doc sequencing + self-consistency. */
import seedPrograms from "../../src/data/programs.json";
import seedExercises from "../../src/data/exercises.json";

describe("seeded SPS program", () => {
  it("is internally doc-consistent: no guardrail messages across all weeks", () => {
    const program = seedPrograms[0] as Program;
    const byId = new Map(
      seedExercises.map((e) => [
        e.id,
        {
          ...e,
          isCustom: false,
          isArchived: false,
          createdAt: 0,
          updatedAt: 0,
        } as Exercise,
      ]),
    );
    expect(programChecks(program, byId)).toEqual([]);
  });

  it("sequences intro → volume → deload → load → peak (§7.2)", () => {
    const phases = seedPrograms[0]!.weeks.map((w) => w.phase ?? "volume");
    expect(phases).toEqual([
      "intro",
      "volume",
      "volume",
      "volume",
      "volume",
      "deload",
      "load",
      "load",
      "load",
      "load",
      "peak",
      "peak",
    ]);
  });

  it("derives first-run single weights from the fallback training max", () => {
    const program = seedPrograms[0] as Program;
    const squatDay = program.weeks[0]!.days[0]!;
    const item = resolveProgramItem(
      squatDay.items[0] as ProgramItem, // squat single @ RPE 6, TM 100
      ctx({ phase: "intro" }),
    );
    // RPE 6 → 0.85 of the fallback TM 100 → 85 kg; intro eases the band to 5.5.
    expect(item?.sets[0]?.weightKg).toBe(85);
    expect(item?.rpeBand).toEqual({ min: 5.5, max: 5.5 });
  });

  it("peak back-offs sit at ~80% of the day's top single (doc rule 16)", () => {
    const program = seedPrograms[0] as Program;
    for (const [wi, expectedTop] of [[10, 92], [11, 95]] as const) {
      const day = program.weeks[wi]!.days[0]!;
      const single = resolveProgramItem(
        day.items[0] as ProgramItem, // squat single @ RPE 8 (P1) / 9 (P2)
        ctx({ phase: "peak" }),
      )!;
      const back = resolveProgramItem(
        day.items[1] as ProgramItem, // 2×3 back-offs
        ctx({ phase: "peak" }),
      )!;
      expect(single.sets[0]!.weightKg).toBe(expectedTop);
      expect(back.sets).toHaveLength(2);
      expect(back.sets.every((s) => s.reps === 3)).toBe(true);
      expect(back.sets[0]!.weightKg).toBeCloseTo(
        0.8 * single.sets[0]!.weightKg,
        5,
      );
    }
  });
});

describe("duplicateProgram", () => {
  it("deep-copies with new id, copy suffix, fresh timestamps", () => {
    const p = makeProgram(1, 1);
    const copy = duplicateProgram(p, "p2", 1234);
    expect(copy.id).toBe("p2");
    expect(copy.name).toBe("Test (copy)");
    expect(copy.createdAt).toBe(1234);
    expect(copy.updatedAt).toBe(1234);
    // Deep copy: mutating the copy must not touch the source.
    copy.weeks[0]!.days[0]!.items[0]!.exerciseId = "changed";
    expect(p.weeks[0]!.days[0]!.items[0]!.exerciseId).toBe("ex");
  });
});
