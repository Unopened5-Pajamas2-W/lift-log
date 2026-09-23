/** Program slot resolution: pure functions, no IO.
 *  Program progress is DERIVED from completed-workout history — there is no
 *  separate state store, so backups can never desync it.
 *  Resolution rule (locked): "first incomplete slot in sequence" — never skip
 *  days, even when workouts were completed out of order.
 */
import type { Program, ProgramItem, Workout } from "./types.ts";

export interface ProgramSlot {
  /** 0-based week index into program.weeks. */
  weekIndex: number;
  /** 0-based day index into the week's days. */
  dayIndex: number;
  /** Number of completed program cycles so far (derivable from history only). */
  cycleCount: number;
  /** True when the just-finished cycle is complete and the next slot wraps to week 1 day 1. */
  cycleComplete: boolean;
}

/** Slots in sequence order: week 0 day 0, week 0 day 1, … week N day M. */
export function programSlots(program: Program): {
  weekIndex: number;
  dayIndex: number;
}[] {
  const slots: { weekIndex: number; dayIndex: number }[] = [];
  for (let wi = 0; wi < program.weeks.length; wi++) {
    const week = program.weeks[wi];
    if (!week) continue;
    for (let di = 0; di < week.days.length; di++)
      slots.push({ weekIndex: wi, dayIndex: di });
  }
  return slots;
}

/** Next session slot for `program`, derived from completed workouts that carry
 *  its `programId`. Resolution is "first incomplete slot in sequence" — never
 *  skipping days, even when workouts were completed out of order (locked).
 *  When the program was edited mid-cycle, slot refs outside the new bounds
 *  are ignored; if nothing in-bounds is complete, progress restarts at week 1
 *  day 1 (locked clamp behavior). */
export function nextProgramSession(
  program: Program,
  workouts: Workout[],
): ProgramSlot {
  const slots = programSlots(program);
  if (slots.length === 0) {
    return { weekIndex: 0, dayIndex: 0, cycleCount: 0, cycleComplete: false };
  }
  const doneIdx = new Set<number>();
  for (const w of workouts) {
    if (w.status !== "completed" || w.programId !== program.id) continue;
    if (w.programWeek === undefined || w.programDayIndex === undefined)
      continue;
    const idx = slots.findIndex(
      (s) => s.weekIndex === w.programWeek && s.dayIndex === w.programDayIndex,
    );
    if (idx >= 0) doneIdx.add(idx);
  }
  const firstIncomplete = slots.findIndex((_, i) => !doneIdx.has(i));
  const next = firstIncomplete >= 0 ? slots[firstIncomplete] : slots[0];
  if (!next) {
    return { weekIndex: 0, dayIndex: 0, cycleCount: 0, cycleComplete: false };
  }
  return {
    weekIndex: next.weekIndex,
    dayIndex: next.dayIndex,
    cycleCount: Math.floor(doneIdx.size / slots.length),
    cycleComplete: firstIncomplete === -1,
  };
}

export interface PrescribedSet {
  weightKg: number;
  reps: number;
}

/** Round to 4 decimals to keep percent math exact and stable in storage. */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Concrete prescribed sets for one program item. Scheme wins when defined;
 *  a scheme-less item returns null (caller falls back to the global engine).
 *  Percent math is exact multiplication of the user-entered training max —
 *  no engine involvement (5/3/1 semantics). A "double" scheme expands to
 *  scheme.sets working sets at the engine-suggested weight and band floor. */
export function resolveProgramItem(
  item: ProgramItem,
  context: {
    /** Engine-suggested weight for "sets-reps" schemes without a fixed weight. */
    suggestedWeightKg?: number;
  },
): PrescribedSet[] | null {
  const scheme = item.scheme;
  if (!scheme) return null;
  switch (scheme.kind) {
    case "sets-reps": {
      const weightKg = scheme.weightKg ?? context.suggestedWeightKg ?? 20;
      return Array.from({ length: scheme.sets }, () => ({
        weightKg,
        reps: scheme.reps,
      }));
    }
    case "percent": {
      if (item.trainingMaxKg === undefined) return null;
      return scheme.sets.map((s) => ({
        weightKg: round4(item.trainingMaxKg! * s.pct),
        reps: s.reps,
      }));
    }
    case "double": {
      // Double schemes prescribe the SET COUNT; the weight comes from the
      // engine (double progression) — no engine suggestion → no prefill.
      if (context.suggestedWeightKg === undefined) return null;
      return Array.from({ length: scheme.sets }, () => ({
        weightKg: context.suggestedWeightKg!,
        reps: scheme.minReps,
      }));
    }
  }
}

/** Deep-copy a program for duplication: new id, " (copy)" suffix, fresh
 *  timestamps, never auto-activated (activeProgramId untouched by caller). */
export function duplicateProgram(
  program: Program,
  newId: string,
  now = Date.now(),
): Program {
  return {
    ...structuredClone(program),
    id: newId,
    name: `${program.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
}
