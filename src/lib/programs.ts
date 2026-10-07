/** Program slot resolution + prescription expansion: pure functions, no IO.
 *  Program progress is DERIVED from completed-workout history — there is no
 *  separate state store, so backups can never desync it.
 *  Resolution rule (locked): "first incomplete slot in sequence" — never skip
 *  days, even when workouts were completed out of order.
 *
 *  Layering (doc-aligned): the stored program is the static plan; the day's
 *  prefill is the autoregulated execution. resolveProgramItem applies phase
 *  transforms (intro −25% volume / deload −40% sets, §8.3/§8.5), anchors
 *  percent math to the training max or the running e1RM (§6.5), and shifts
 *  banded percent loads ~2% per 0.5 RPE outside the band (§2.3) — the stored
 *  plan itself is never mutated.
 */
import type {
  Exercise,
  MuscleGroup,
  PhaseKind,
  Program,
  ProgramDay,
  ProgramItem,
  ProgramScheme,
  RpeBand,
  Units,
  Workout,
} from "./types.ts";
import type { RepsBand } from "./progression.ts";
import { displayWeight, formatWeight, round4 } from "./units.ts";
import { buildWarmupRamp } from "./suggest.ts";
import { MUSCLE_LABELS } from "../data/muscles.ts";

export interface ProgramSlot {
  /** 0-based week index into program.weeks. */
  weekIndex: number;
  /** 0-based day index into the week's days. */
  dayIndex: number;
  /** Completed program sessions ÷ sessions per cycle (derivable from history only). */
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
 *  day 1 (locked clamp behavior). `cycleCount` = completed program sessions
 *  ÷ sessions per cycle, so it keeps climbing across repeated cycles. */
export function nextProgramSession(
  program: Program,
  workouts: Workout[],
): ProgramSlot {
  const slots = programSlots(program);
  if (slots.length === 0) {
    return { weekIndex: 0, dayIndex: 0, cycleCount: 0, cycleComplete: false };
  }
  const doneIdx = new Set<number>();
  let completedStamps = 0;
  for (const w of workouts) {
    if (w.status !== "completed" || w.programId !== program.id) continue;
    if (w.programWeek === undefined || w.programDayIndex === undefined)
      continue;
    completedStamps += 1;
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
    cycleCount: Math.floor(completedStamps / slots.length),
    cycleComplete: firstIncomplete === -1,
  };
}

export interface PrescribedSet {
  weightKg: number;
  reps: number;
  /** §10.4 warmup-ramp row (prefilled; excluded from engine and analytics). */
  isWarmup?: boolean;
}

/** §2.3 missed-RPE load correction, as % of load to ADD: in-band → 0; above
 *  the band → −4% per RPE (9 → −4%, 9.5 → −6%, 10 → −8%); below → +4% per
 *  RPE (5 → +4%, 4 → +8%). Rule of thumb: ~2% per 0.5 RPE outside the band. */
export function rpeLoadCorrectionPct(rpe: number, band: RpeBand): number {
  if (rpe >= band.min && rpe <= band.max) return 0;
  const outside = rpe < band.min ? band.min - rpe : rpe - band.max;
  return (rpe < band.min ? 4 : -4) * outside;
}

/** Everything a consumer needs to materialize one program item. */
export interface ExpandContext {
  units: Units;
  /** The slot's week phase; absent (legacy) = "volume" — no transform. */
  phase?: PhaseKind;
  /** §8.3 app-level deload window active (sets cut ~40%, loads kept). */
  deloadActive?: boolean;
  /** Engine-suggested weight for the exercise (double progression / overload
   *  prefill); absent (editor previews) makes engine-dependent items null.
   *  `band`/`rpeCeiling` carry the double scheme's progression parameters. */
  engineSuggest?(
    exerciseId: string,
    opts?: { band?: RepsBand; rpeCeiling?: number },
  ): { weightKg: number; reps: number } | undefined;
  /** Running e1RM for the exercise (§6.5 same calculator). */
  runningE1rm?(exerciseId: string): number | undefined;
  /** Latest logged top-set RPE, for §2.3 gauge corrections. */
  lastTopRpe?(exerciseId: string): number | undefined;
  exerciseById: Map<string, Exercise>;
}

/** One resolved program item: materialized working sets (warmups prepended
 *  by expandProgramDay) + the RPE band to target + a % gauge for display. */
export interface ExpandedItem {
  exerciseId: string;
  sets: PrescribedSet[];
  /** RPE band the lifter targets; null for engine-governed bands. */
  rpeBand?: RpeBand;
  /** Top-set % of the scheme's anchor — display-only gauge (§2.3). */
  gaugePct?: number;
  /** Which anchor the gauge refers to. */
  gaugeAnchor?: "tm" | "e1rm";
}

/** Compact prescription line for display, e.g. "3×8 @ 60 kg" or
 *  "3 sets — 65×5 · 75×5 · 85×5 @ 6–8 RPE · 85% TM". Pure. */
export function describePrescription(
  item: ExpandedItem,
  units: Units,
): string {
  const working = item.sets.filter((s) => s.isWarmup !== true);
  if (working.length === 0) return "";
  const weights = [...new Set(working.map((s) => s.weightKg))];
  const reps = [...new Set(working.map((s) => s.reps))];
  const setsPart =
    weights.length === 1 && reps.length === 1
      ? `${working.length}×${reps[0]} @ ${formatWeight(weights[0]!, units)}`
      : `${working.length} sets — ${working
          .map((s) => `${displayWeight(s.weightKg, units)}×${s.reps}`)
          .join(" · ")}`;
  const parts = [setsPart];
  if (item.rpeBand)
    parts.push(`@ ${item.rpeBand.min}–${item.rpeBand.max} RPE`);
  if (item.gaugePct != null)
    parts.push(
      `${Math.round(item.gaugePct)}% ${item.gaugeAnchor === "e1rm" ? "e1RM" : "TM"}`,
    );
  return parts.join(" ");
}

/** Volume scale for a slot (§8.3 standard deload = sets ×~0.6, loads/RIR/
 *  frequency kept; §8.5 intro cycle = ~75% of planned volume). Deload never
 *  stacks with a tagged deload week — the more conservative scale wins. */
export function phaseVolumeScale(
  phase: PhaseKind | undefined,
  deloadActive: boolean,
): number {
  const intro = phase === "intro" ? 0.75 : 1;
  const deload = phase === "deload" || deloadActive ? 0.6 : 1;
  return Math.min(intro, deload);
}

/** §8.5 intro: slightly farther from failure — RPE band eased by 0.5 (floor 5,
 *  below which RIR stops being meaningful). */
function easeRpeBand(band: RpeBand): RpeBand {
  return {
    min: Math.max(5, band.min - 0.5),
    max: Math.max(5, band.max - 0.5),
  };
}

/** Concrete prescribed sets for one program item. Scheme wins when defined;
 *  a scheme-less item returns null (caller falls back to the global engine).
 *  Percent math is exact multiplication of the anchor (training max, or the
 *  running e1RM for `of: "e1rm"` back-offs); when the scheme carries an RPE
 *  band and the last logged RPE fell outside it, the prefilled gauge load
 *  self-corrects — the stored prescription never changes. */
export function resolveProgramItem(
  item: ProgramItem,
  context: ExpandContext,
): ExpandedItem | null {
  const scheme = item.scheme;
  if (!scheme) return null;
  const scale = phaseVolumeScale(context.phase, context.deloadActive === true);
  switch (scheme.kind) {
    case "sets-reps": {
      const weightKg =
        scheme.weightKg ??
        context.engineSuggest?.(item.exerciseId)?.weightKg;
      if (weightKg === undefined) return null;
      const count = Math.max(1, Math.round(scheme.sets * scale));
      const rpe =
        scheme.rpe != null && context.phase === "intro"
          ? Math.max(5, scheme.rpe - 0.5)
          : scheme.rpe;
      const out: ExpandedItem = {
        exerciseId: item.exerciseId,
        sets: Array.from(
          { length: count },
          () => ({ weightKg, reps: scheme.reps }),
        ),
      };
      if (rpe != null) out.rpeBand = { min: rpe, max: rpe };
      return out;
    }
    case "percent": {
      const anchor =
        scheme.of === "e1rm"
          ? (context.runningE1rm?.(item.exerciseId) ?? item.trainingMaxKg)
          : item.trainingMaxKg;
      if (anchor === undefined) return null;
      let band = scheme.rpe ? { ...scheme.rpe } : undefined;
      if (band && context.phase === "intro") band = easeRpeBand(band);
      let factor = 1;
      if (band) {
        const rpe = context.lastTopRpe?.(item.exerciseId);
        if (rpe != null)
          factor = 1 + rpeLoadCorrectionPct(rpe, band) / 100;
      }
      const kept = Math.max(1, Math.round(scheme.sets.length * scale));
      return {
        exerciseId: item.exerciseId,
        sets: scheme.sets.slice(0, kept).map((s) => ({
          weightKg: round4(anchor * s.pct * factor),
          reps: s.reps,
        })),
        ...(band ? { rpeBand: band } : {}),
        gaugePct: Math.max(...scheme.sets.map((s) => s.pct)) * 100,
        gaugeAnchor: scheme.of ?? "tm",
      };
    }
    case "double": {
      // Double schemes prescribe the SET COUNT; the weight comes from the
      // engine (double progression) — no engine suggestion → no prefill.
      const sugg = context.engineSuggest?.(item.exerciseId, {
        band: { minReps: scheme.minReps, maxReps: scheme.maxReps },
        rpeCeiling: scheme.rpeCeiling,
      });
      if (!sugg) return null;
      const count = Math.max(1, Math.round(scheme.sets * scale));
      return {
        exerciseId: item.exerciseId,
        sets: Array.from(
          { length: count },
          () => ({ weightKg: sugg.weightKg, reps: sugg.reps }),
        ),
      };
    }
  }
}

/** Materialize a whole day: resolved items in order, with the §10.4 warmup
 *  ramp prepended to the first exercise per primary muscle. Scheme-less items
 *  fall back to one engine-suggested working set (Auto semantics); items that
 *  stay unresolvable (unknown exercise) are skipped — callers show them as
 *  muted/skippable rows. */
export function expandProgramDay(
  day: ProgramDay,
  context: ExpandContext,
): ExpandedItem[] {
  const out: ExpandedItem[] = [];
  const warmed = new Set<MuscleGroup>();
  for (const item of day.items) {
    let expanded = resolveProgramItem(item, context);
    if (!expanded) {
      const sugg = context.engineSuggest?.(item.exerciseId);
      if (!sugg) continue;
      expanded = {
        exerciseId: item.exerciseId,
        sets: [{ weightKg: sugg.weightKg, reps: sugg.reps }],
      };
    }
    const muscle = context.exerciseById.get(item.exerciseId)?.primaryMuscle;
    if (muscle && !warmed.has(muscle)) {
      warmed.add(muscle);
      // Ramp targets the heaviest working set's weight and rep count.
      const top = expanded.sets.reduce((a, b) =>
        b.weightKg > a.weightKg ? b : a,
      );
      expanded.sets = [
        ...buildWarmupRamp(top.weightKg, top.reps),
        ...expanded.sets,
      ];
    }
    out.push(expanded);
  }
  return out;
}

/** Set-counting shape for one scheme (plan level, before transforms). */
function schemeSetReps(
  scheme: ProgramScheme | undefined,
): { reps: number; count: number }[] {
  if (!scheme) return [];
  switch (scheme.kind) {
    case "sets-reps":
      return [{ reps: scheme.reps, count: scheme.sets }];
    case "percent":
      return scheme.sets.map((s) => ({ reps: s.reps, count: 1 }));
    case "double":
      return [{ reps: scheme.minReps, count: scheme.sets }];
  }
}

/** Per-muscle weekly dose for one week (§3.1 fractional counting). */
export interface VolumeRow {
  muscle: MuscleGroup;
  /** Fractional hypertrophy sets: 1.0 primary / 0.5 secondary, sets lasting ≥4 reps. */
  fractional: number;
  /** Direct strength sets: 1–5-rep sets (§3.1 — strength work, not hypertrophy volume). */
  strength: number;
  /** Most fractional sets of this muscle in any single session (cap ~11, §3.1). */
  perSessionMax: number;
  /** Sessions this week containing the muscle (≥2×/week gate, §8.6). */
  exposures: number;
}

/** Fractional weekly volume for `program.weeks[weekIndex]`, per muscle. */
export function fractionalVolume(
  program: Program,
  weekIndex: number,
  exerciseById: Map<string, Exercise>,
): Map<MuscleGroup, VolumeRow> {
  const rows = new Map<MuscleGroup, VolumeRow>();
  const week = program.weeks[weekIndex];
  if (!week) return rows;
  const ensure = (m: MuscleGroup): VolumeRow => {
    let r = rows.get(m);
    if (!r) {
      r = { muscle: m, fractional: 0, strength: 0, perSessionMax: 0, exposures: 0 };
      rows.set(m, r);
    }
    return r;
  };
  for (const day of week.days) {
    const perSession = new Map<MuscleGroup, number>();
    const seen = new Set<MuscleGroup>();
    for (const item of day.items) {
      const ex = exerciseById.get(item.exerciseId);
      if (!ex) continue;
      for (const { reps, count } of schemeSetReps(item.scheme)) {
        if (reps >= 4) {
          for (const [m, w] of [
            [ex.primaryMuscle, 1],
            ...ex.secondaryMuscles.map((m) => [m, 0.5] as const),
          ] as const) {
            const row = ensure(m);
            row.fractional += w * count;
            perSession.set(m, (perSession.get(m) ?? 0) + w * count);
          }
        }
        if (reps <= 5) ensure(ex.primaryMuscle).strength += count;
      }
      seen.add(ex.primaryMuscle);
      for (const m of ex.secondaryMuscles) seen.add(m);
    }
    for (const [m, v] of perSession) ensure(m).perSessionMax = Math.max(ensure(m).perSessionMax, v);
    for (const m of seen) ensure(m).exposures += 1;
  }
  return rows;
}

export interface ProgramCheck {
  level: "warn" | "info";
  message: string;
}

/** Soft doc guardrails across all weeks (§3.1, §3.3) — hard caps only, so
 *  intentional phase tapering (peaks, load-phase halving) doesn't false-alarm.
 *  Advisory only, never blocks editing (tier 1 adherence: flexibility). */
export function programChecks(
  program: Program,
  exerciseById: Map<string, Exercise>,
): ProgramCheck[] {
  const seen = new Set<string>();
  const checks: ProgramCheck[] = [];
  const push = (level: ProgramCheck["level"], message: string): void => {
    if (!seen.has(message)) {
      seen.add(message);
      checks.push({ level, message });
    }
  };
  for (let wi = 0; wi < program.weeks.length; wi++) {
    const perLift = new Map<string, number>();
    const liftNames = new Map<string, string>();
    for (const day of program.weeks[wi]?.days ?? []) {
      for (const item of day.items) {
        const ex = exerciseById.get(item.exerciseId);
        if (ex) liftNames.set(item.exerciseId, ex.name);
        for (const { count } of schemeSetReps(item.scheme))
          perLift.set(item.exerciseId, (perLift.get(item.exerciseId) ?? 0) + count);
      }
    }
    for (const [id, count] of perLift) {
      if (count > 10)
        push("warn", `${liftNames.get(id) ?? id}: ${count} sets/week is a hypertrophy dose — strength plateaus around ~5 sets/lift/week (doc §3.3).`);
    }
    for (const [, row] of fractionalVolume(program, wi, exerciseById)) {
      if (row.perSessionMax > 11)
        push("warn", `${MUSCLE_LABELS[row.muscle]}: ${row.perSessionMax} fractional sets in one session — cap is ~11 (doc §3.1).`);
    }
  }
  return checks;
}

/** Deep-copy a program for duplication: new id, " (copy)" suffix, fresh
 *  timestamps, never auto-activates (activeProgramId untouched by caller). */
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
