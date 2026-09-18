/**
 * Per-exercise progress drill-in (spec R1–R5): trend chart with range
 * control, rep-max ladder, and recent-sessions log. All derivations go
 * through analytics.ts; this file only loads, lays out, and formats.
 */
import { openExerciseInfo } from "../components/exerciseInfo.ts";
import { segmented } from "../components/segmented.ts";
import { renderTrendChart } from "../components/trendChart.ts";
import type { RangeKey, SessionPoint } from "../lib/analytics.ts";
import {
  exerciseSessionPoints,
  groupByWorkout,
  repMaxLadder,
  windowCutoff,
} from "../lib/analytics.ts";
import { setE1RM } from "../lib/metrics.ts";
import {
  getExercise,
  getSetsForExercise,
  listWorkouts,
  loadSettings,
} from "../lib/store.ts";
import type { Exercise, Units, WorkoutSet } from "../lib/types.ts";
import { formatWeight } from "../lib/units.ts";
import { fmtDate, go, h } from "../lib/ui.ts";
import { MUSCLE_LABELS } from "../data/muscles.ts";

const RANGES: readonly { value: RangeKey; label: string }[] = [
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "All", label: "All" },
];

/** Header: back navigation, name, muscle/equipment caption, instructions. */
function headerCard(ex: Exercise, returnTo: string): HTMLElement {
  return h(
    "div",
    { class: "card" },
    h(
      "div",
      { class: "row" },
      h("button", { onclick: () => go(returnTo) }, "Back"),
      h("button", { onclick: () => openExerciseInfo(ex) }, "How to"),
    ),
    h("strong", {}, ex.name),
    h(
      "p",
      { class: "muted" },
      `${MUSCLE_LABELS[ex.primaryMuscle]} · ${ex.equipment}`,
    ),
  );
}

/** One ladder table row; best-e1RM row is visually highlighted. */
function ladderRow(
  r: ReturnType<typeof repMaxLadder>[number],
  best: number,
  units: Units,
): HTMLElement {
  const isBest = r.e1rmKg > 0 && r.e1rmKg === best;
  return h(
    "tr",
    isBest ? { class: "ladder-best" } : {},
    h("td", {}, String(r.targetReps)),
    h(
      "td",
      {},
      r.weightKg == null ? "—" : `${formatWeight(r.weightKg, units)} × ${r.reps}`,
    ),
    h("td", {}, r.e1rmKg > 0 ? formatWeight(r.e1rmKg, units) : "—"),
    h("td", {}, r.achievedAt > 0 ? fmtDate(r.achievedAt) : "—"),
  );
}

/** Rep-max ladder table (R4); gaps as em-dash rows keep the shape stable. */
function ladderCard(sets: WorkoutSet[], units: Units): HTMLElement {
  const rows = repMaxLadder(sets);
  const best = Math.max(...rows.map((r) => r.e1rmKg));
  const table = h(
    "table",
    { class: "set-table" },
    h(
      "thead",
      {},
      h(
        "tr",
        {},
        h("th", {}, "Reps"),
        h("th", {}, "Best set"),
        h("th", {}, "e1RM"),
        h("th", {}, "Date"),
      ),
    ),
  );
  const tbody = h("tbody", {});
  for (const r of rows) tbody.appendChild(ladderRow(r, best, units));
  table.appendChild(tbody);
  return h(
    "div",
    { class: "card" },
    h("strong", {}, "Rep-max ladder"),
    h("div", { class: "table-wrap" }, table),
  );
}

/** The set with the best e1RM for a session (top set shown in the log). */
function topSet(list: WorkoutSet[]): WorkoutSet | undefined {
  let top: WorkoutSet | undefined;
  for (const s of list) {
    if (!s.completed || s.isWarmup === true) continue;
    if (!top || setE1RM(s) > setE1RM(top)) top = s;
  }
  return top;
}

/** One sessions-log row: date, top set, e1RM delta arrow vs prior session. */
function sessionRow(
  p: SessionPoint,
  prev: SessionPoint | undefined,
  setsByWorkout: Map<string, WorkoutSet[]>,
  units: Units,
): HTMLElement {
  const cur = p.bestE1rmKg;
  const before = prev?.bestE1rmKg ?? 0;
  const delta = cur > 0 && before > 0 ? cur - before : null;
  const cls = delta == null ? "" : delta >= 0 ? "delta-up" : "delta-down";
  const arrow = delta == null ? "—" : delta >= 0 ? "▲" : "▼";
  const top = topSet(setsByWorkout.get(p.workoutId) ?? []);
  const topText = top
    ? `${formatWeight(top.weightKg + (top.addedWeightKg ?? 0), units)} × ${top.reps}`
    : "—";
  const deltaText = delta == null ? "" : formatWeight(Math.abs(delta), units);
  return h(
    "li",
    { class: cls },
    h("span", {}, fmtDate(p.t)),
    h("span", { class: "pr-meta" }, `${topText} · ${arrow} ${deltaText}`),
  );
}

/** Recent-sessions log (R5): most recent first, capped at 10. */
function sessionsCard(
  points: SessionPoint[],
  setsByWorkout: Map<string, WorkoutSet[]>,
  units: Units,
): HTMLElement {
  const card = h("div", { class: "card" }, h("strong", {}, "Recent sessions"));
  const ul = h("ul", { class: "recovery-list" });
  const recent = [...points].reverse().slice(0, 10);
  if (recent.length === 0)
    ul.appendChild(h("li", {}, "No completed sessions yet."));
  for (let i = 0; i < recent.length; i++) {
    const p = recent[i];
    if (!p) continue;
    ul.appendChild(sessionRow(p, recent[i + 1], setsByWorkout, units));
  }
  card.appendChild(ul);
  return card;
}

/** Batch-load everything the drill-in needs in one round trip. */
async function loadDrillData(exerciseId: string) {
  const [ex, sets, workouts, settings] = await Promise.all([
    getExercise(exerciseId),
    getSetsForExercise(exerciseId),
    listWorkouts("completed", 500),
    loadSettings(),
  ]);
  // Sets belong to the analytics layer only if their workout completed
  // (getSetsForExercise returns every set, including discarded sessions).
  const completedIds = new Set(
    workouts.filter((w) => w.status === "completed").map((w) => w.id),
  );
  const byWorkout = groupByWorkout(sets, completedIds);
  return {
    ex,
    units: settings.units,
    completedSets: sets.filter((s) => completedIds.has(s.workoutId)),
    byWorkout,
    points: exerciseSessionPoints(sets, workouts),
  };
}

/** Range control + trend chart; the control re-windows via chart.update. */
function chartSection(allPoints: SessionPoint[], units: Units): HTMLElement {
  let range: RangeKey = "3M";
  const chart = renderTrendChart(allPoints, units);
  const rangeCtl = segmented("Chart range", RANGES, range, (value) => {
    range = value as RangeKey;
    const cutoff = windowCutoff(range, Date.now());
    chart.update(cutoff == null ? allPoints : allPoints.filter((p) => p.t >= cutoff));
  });
  return h("div", {}, rangeCtl, chart.element);
}

/** Placeholder card when a lift has no weighted history (spec §6.2):
 *  replaces the chart section and ladder entirely for bodyweight-only lifts. */
function ladderEmptyCard(): HTMLElement {
  return h(
    "div",
    { class: "card" },
    h("strong", {}, "No weighted sets yet"),
    h(
      "p",
      { class: "muted" },
      "Log sets with weight to build trends and a rep-max ladder.",
    ),
  );
}

/** Drill-in view: header → range control → chart → ladder → sessions. */
export async function renderExerciseProgress(
  exerciseId: string,
  returnTo: string = "/progress",
): Promise<HTMLElement> {
  const data = await loadDrillData(exerciseId);
  if (!data.ex) return h("div", { class: "card" }, "Exercise not found.");
  const { ex, units, completedSets, byWorkout, points: allPoints } = data;

  const root = h("div", {});
  root.appendChild(headerCard(ex, returnTo));

  if (allPoints.length === 0) {
    root.appendChild(
      h(
        "div",
        { class: "card" },
        h("strong", {}, "No data yet"),
        h("p", { class: "muted" }, "Finish a workout to see trends."),
      ),
    );
    return root;
  }

  // Volume and e1RM null out together per exercise, so a fully-bodyweight
  // history collapses the chart + ladder into one notice (spec §6.2).
  const hasPlottable = allPoints.some((p) => p.bestE1rmKg > 0 || p.volumeKg > 0);
  if (hasPlottable) {
    root.appendChild(chartSection(allPoints, units));
    root.appendChild(ladderCard(completedSets, units));
  } else {
    root.appendChild(ladderEmptyCard());
  }
  root.appendChild(sessionsCard(allPoints, byWorkout, units));
  return root;
}
