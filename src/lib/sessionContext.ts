/** Expansion context for program prescriptions: per-exercise history fetch +
 *  engine suggestions + running e1RM + last top-set RPE (doc §6.3, §6.5, §2.3).
 *  Shared by the Today prefill and the in-session add/swap paths so both
 *  materialize prescriptions identically. */
import type { Exercise, Units, WorkoutSet } from "./types.ts";
import type { ExpandContext } from "./programs.ts";
import { doubleProgression } from "./progression.ts";
import { lastTopRpe, runningE1RM } from "./metrics.ts";
import { getSetsForExercise } from "./store.ts";

/** Build an ExpandContext for the given exercises, fetching each one's
 *  completed history once. Missing exercises degrade to empty history. */
export async function buildExpandContext(opts: {
  units: Units;
  exerciseById: Map<string, Exercise>;
  exerciseIds: string[];
  now: number;
}): Promise<ExpandContext> {
  const history = new Map<string, WorkoutSet[]>();
  await Promise.all(
    opts.exerciseIds.map(async (id) => {
      try {
        history.set(
          id,
          (await getSetsForExercise(id)).filter((s) => s.completed),
        );
      } catch {
        history.set(id, []);
      }
    }),
  );
  return {
    units: opts.units,
    exerciseById: opts.exerciseById,
    engineSuggest: (exerciseId, schemeOpts) => {
      const ex = opts.exerciseById.get(exerciseId);
      if (!ex) return undefined;
      return doubleProgression({
        lastSets: history.get(exerciseId) ?? [],
        band: schemeOpts?.band,
        primaryMuscle: ex.primaryMuscle,
        units: opts.units,
        now: opts.now,
        rpeCeiling: schemeOpts?.rpeCeiling,
      });
    },
    runningE1rm: (exerciseId) => {
      const value = runningE1RM(history.get(exerciseId) ?? []);
      return value > 0 ? value : undefined;
    },
    lastTopRpe: (exerciseId) => lastTopRpe(history.get(exerciseId) ?? []),
  };
}
