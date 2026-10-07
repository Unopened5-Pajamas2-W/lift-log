// Generates src/data/programs.json: the doc-aligned SPS canned program.
// Main lifts = daily prescribed singles encoded as percent-of-e1RM (pct =
// pct1rmForRpe(rpe)) with a point RPE band — the band is the prescription,
// the % load is the gauge that self-corrects; TM fields are first-run
// fallbacks until the running e1RM exists. Accessories = double progression.
// Peak weeks = doc rule-16 peaking kernel: heavy top single + 2×3 back-offs
// at ~80% OF THE DAY'S TOP SINGLE — the back-off pct is computed from the
// same PCT entry that sets the top single, never an independent literal.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PCT = { 5: 0.8, 6: 0.85, 7: 0.9, 8: 0.92, 8.5: 0.935, 9: 0.95 };
const round4 = (v) => Math.round(v * 10000) / 10000;
/** Doc rule 16: back-off load ≈ 80% of the day's top single. */
const KERNEL_BACKOFF_RATIO = 0.8;

const single = (id, rpe, tm) => ({
  exerciseId: id,
  scheme: {
    kind: "percent",
    sets: [{ pct: PCT[rpe], reps: 1 }],
    rpe: { min: rpe, max: rpe },
    of: "e1rm",
  },
  trainingMaxKg: tm,
});

const skill = (id, sets, tm) => ({
  exerciseId: id,
  scheme: {
    kind: "percent",
    sets: Array.from({ length: sets }, () => ({ pct: 0.8, reps: 1 })),
    rpe: { min: 5, max: 7 },
    of: "e1rm",
  },
  trainingMaxKg: tm,
});

const backoffs = (id, sets, reps, pct, tm) => ({
  exerciseId: id,
  scheme: {
    kind: "percent",
    sets: Array.from({ length: sets }, () => ({ pct, reps })),
    rpe: { min: 5, max: 8 },
    of: "e1rm",
  },
  trainingMaxKg: tm,
});

const dbl = (id, sets, minReps, maxReps) => ({
  exerciseId: id,
  scheme: { kind: "double", sets, minReps, maxReps, rpeCeiling: 8 },
});

const day1 = (rpe) => ({
  name: "Squat + Push",
  items: [
    single("back-squat", rpe, 100),
    skill("deadlift", 2, 120),
    dbl("leg-press", 3, 8, 12),
    dbl("machine-chest-press", 3, 8, 12),
    dbl("lying-leg-curl", 3, 10, 15),
  ],
});

const day2 = (rpe) => ({
  name: "Bench + Pull",
  items: [
    single("barbell-bench-press", rpe, 80),
    dbl("incline-dumbbell-press", 3, 8, 12),
    dbl("seated-cable-row", 3, 8, 12),
    dbl("lateral-raise", 2, 10, 15),
  ],
});

const day3 = (rpe) => ({
  name: "Deadlift + Practice",
  items: [
    single("deadlift", rpe, 120),
    skill("back-squat", 3, 100),
    skill("barbell-bench-press", 3, 80),
    dbl("barbell-row", 3, 8, 12),
  ],
});

const day1Load = (rpe, reps) => ({
  name: "Squat + Push",
  items: [
    single("back-squat", rpe, 100),
    backoffs("back-squat", 2, reps, 0.85, 100),
    dbl("machine-chest-press", 2, 8, 12),
    dbl("lying-leg-curl", 2, 10, 15),
  ],
});

const day2Load = (rpe, reps) => ({
  name: "Bench + Pull",
  items: [
    single("barbell-bench-press", rpe, 80),
    backoffs("barbell-bench-press", 2, reps, 0.85, 80),
    dbl("incline-dumbbell-press", 2, 8, 12),
    dbl("seated-cable-row", 2, 8, 12),
    dbl("lateral-raise", 1, 10, 15),
  ],
});

const day3Load = (rpe, reps) => ({
  name: "Deadlift + Practice",
  items: [
    single("deadlift", rpe, 120),
    backoffs("deadlift", 2, reps, 0.8, 120),
    skill("back-squat", 3, 100),
    dbl("barbell-row", 2, 8, 12),
  ],
});

const day1Peak = (rpe) => ({
  name: "Squat + Push",
  items: [
    single("back-squat", rpe, 100),
    backoffs("back-squat", 2, 3, round4(KERNEL_BACKOFF_RATIO * PCT[rpe]), 100),
    dbl("machine-chest-press", 1, 8, 12),
    dbl("lying-leg-curl", 1, 10, 15),
  ],
});

const day2Peak = (rpe) => ({
  name: "Bench + Pull",
  items: [
    single("barbell-bench-press", rpe, 80),
    backoffs("barbell-bench-press", 2, 3, round4(KERNEL_BACKOFF_RATIO * PCT[rpe]), 80),
    dbl("incline-dumbbell-press", 1, 8, 12),
    dbl("seated-cable-row", 1, 8, 12),
    dbl("lateral-raise", 1, 10, 15),
  ],
});

const day3Peak = (rpe) => ({
  name: "Deadlift + Practice",
  items: [
    single("deadlift", rpe, 120),
    backoffs("deadlift", 2, 3, round4(KERNEL_BACKOFF_RATIO * PCT[rpe]), 120),
    skill("back-squat", 3, 100),
    dbl("barbell-row", 1, 8, 12),
  ],
});

const program = {
  id: "prog-sps-strength-base",
  name: "Strength Base — volume → load → peak (example)",
  description:
    "Phased strength program: intro → volume → deload → load → peak. Each session opens with one single at a prescribed RPE on its main lift — that feeds the e1RM trend; accessories run autoregulated double progression (band top within the RPE ceiling → +weight). The % loads are starting gauges: they anchor to the placeholder training maxes first, then to your running e1RM, and self-correct ~2% per 0.5 RPE off-target. Deloads otherwise run reactively via the weekly check-in on Today.",
  weeks: [
    { label: "Intro", phase: "intro", days: [day1(6), day2(6), day3(6)] },
    { label: "Volume 1", phase: "volume", days: [day1(5), day2(5), day3(5)] },
    { label: "Volume 2", phase: "volume", days: [day1(6), day2(6), day3(6)] },
    { label: "Volume 3", phase: "volume", days: [day1(7), day2(7), day3(7)] },
    { label: "Volume 4", phase: "volume", days: [day1(8), day2(8), day3(8)] },
    {
      label: "Deload",
      phase: "deload",
      days: [day1(6), day2(6), day3(6)],
    },
    {
      label: "Load 1",
      phase: "load",
      days: [day1Load(7, 5), day2Load(7, 5), day3Load(7, 5)],
    },
    {
      label: "Load 2",
      phase: "load",
      days: [day1Load(8, 4), day2Load(8, 4), day3Load(8, 4)],
    },
    {
      label: "Load 3",
      phase: "load",
      days: [day1Load(8.5, 4), day2Load(8.5, 4), day3Load(8.5, 4)],
    },
    {
      label: "Load 4",
      phase: "load",
      days: [day1Load(9, 3), day2Load(9, 3), day3Load(9, 3)],
    },
    {
      label: "Peak 1",
      phase: "peak",
      days: [day1Peak(8), day2Peak(8), day3Peak(8)],
    },
    {
      label: "Peak 2",
      phase: "peak",
      days: [day1Peak(9), day2Peak(9), day3Peak(9)],
    },
  ],
};

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "data", "programs.json");
writeFileSync(out, `${JSON.stringify([program], null, 2)}\n`);
console.log(`wrote ${out}`);
