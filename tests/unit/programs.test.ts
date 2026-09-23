/** v2 program vectors: day resolution (first incomplete slot, never skip),
 *  cycle wrap, clamp on mid-cycle edits, percent math, scheme bypass. */
import { describe, expect, it } from "vitest";
import {
  duplicateProgram,
  nextProgramSession,
  programSlots,
  resolveProgramItem,
} from "../../src/lib/programs.ts";
import type { Program, Workout } from "../../src/lib/types.ts";

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

describe("resolveProgramItem", () => {
  it("returns null for scheme-less items (engine decides)", () => {
    expect(resolveProgramItem({ exerciseId: "ex" }, {})).toBeNull();
  });

  it("expands sets-reps with a fixed weight", () => {
    const sets = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: { kind: "sets-reps", sets: 3, reps: 5, weightKg: 60 },
      },
      {},
    );
    expect(sets).toEqual([
      { weightKg: 60, reps: 5 },
      { weightKg: 60, reps: 5 },
      { weightKg: 60, reps: 5 },
    ]);
  });

  it("sets-reps without a fixed weight uses the suggested weight", () => {
    const sets = resolveProgramItem(
      { exerciseId: "ex", scheme: { kind: "sets-reps", sets: 2, reps: 8 } },
      { suggestedWeightKg: 42.5 },
    );
    expect(sets).toEqual([
      { weightKg: 42.5, reps: 8 },
      { weightKg: 42.5, reps: 8 },
    ]);
  });

  it("percent math is exact multiplication of the training max", () => {
    const sets = resolveProgramItem(
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
      {},
    );
    expect(sets).toEqual([
      { weightKg: 65, reps: 5 },
      { weightKg: 75, reps: 5 },
      { weightKg: 85, reps: 5 },
    ]);
  });

  it("percent with awkward training max rounds to 4 decimals", () => {
    const sets = resolveProgramItem(
      {
        exerciseId: "ex",
        scheme: { kind: "percent", sets: [{ pct: 0.65, reps: 5 }] },
        trainingMaxKg: 92.5,
      },
      {},
    );
    expect(sets?.[0]?.weightKg).toBeCloseTo(60.125, 4);
  });

  it("percent without a training max degrades to engine fallback", () => {
    expect(
      resolveProgramItem(
        { exerciseId: "ex", scheme: { kind: "percent", sets: [{ pct: 0.65, reps: 5 }] } },
        {},
      ),
    ).toBeNull();
  });

  it("double-band schemes resolve to null (Phase 2 engine)", () => {
    expect(
      resolveProgramItem(
        {
          exerciseId: "ex",
          scheme: { kind: "double", sets: 3, minReps: 8, maxReps: 12 },
        },
        {},
      ),
    ).toBeNull();
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
