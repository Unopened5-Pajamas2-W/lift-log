/**
 * Progress tab (spec R6–R8): consistency card, muscle split, aggregate volume
 * trend, exercise picker, PR feed, and per-exercise bests — all rows tap
 * through to the per-exercise drill-in.
 */
import { renderConsistencyCard } from "../components/consistencyCard.ts";
import { renderMuscleSplitCard } from "../components/muscleSplit.ts";
import { renderVolumeChart } from "../components/volumeChart.ts";
import { consistencyStats, groupByWorkout } from "../lib/analytics.ts";
import { sessionBestE1RM, sessionVolume } from "../lib/metrics.ts";
import { allCompletedSets, listExercises, listWorkouts, loadSettings } from "../lib/store.ts";
import type { Exercise, Units, WorkoutSet } from "../lib/types.ts";
import { formatWeight } from "../lib/units.ts";
import { fmtDate, h } from "../lib/ui.ts";

/** Hash href for a lift's drill-in, returning to this view. */
function drillHref(exerciseId: string): string {
  return `#/progress/exercise/${encodeURIComponent(exerciseId)}?from=/progress`;
}

/** Shared tap-through row: name on the left, meta on the right (R6). */
function drillRow(
  exerciseId: string,
  name: string,
  meta: string,
): HTMLElement {
  return h(
    "li",
    {},
    h(
      "a",
      {
        href: drillHref(exerciseId),
        "aria-label": `${name}: view progress`,
      },
      h("span", {}, name),
      h("span", { class: "pr-meta" }, meta),
    ),
  );
}

/** Group completed sets by exerciseId (input order preserved). */
function groupByExercise(sets: WorkoutSet[]): Map<string, WorkoutSet[]> {
  const byExercise = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const list = byExercise.get(s.exerciseId);
    if (list) list.push(s);
    else byExercise.set(s.exerciseId, [s]);
  }
  return byExercise;
}

/** Exercise picker (R6): chips for lifts with history, newest first. */
function pickerCard(
  sets: WorkoutSet[],
  byId: Map<string, Exercise>,
): HTMLElement {
  const latest = new Map<string, number>();
  for (const s of sets) {
    const cur = latest.get(s.exerciseId);
    if (cur == null || s.createdAt > cur) latest.set(s.exerciseId, s.createdAt);
  }
  const ids = [...latest.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
  const card = h("div", { class: "card" }, h("strong", {}, "Explore a lift"));
  if (ids.length === 0) {
    card.appendChild(h("p", { class: "muted" }, "Finish a workout to explore lifts."));
    return card;
  }
  const row = h("div", { class: "chip-row" });
  for (const id of ids) {
    const name = byId.get(id)?.name ?? id;
    row.appendChild(
      h(
        "a",
        { class: "chip", href: drillHref(id), "aria-label": `${name}: view progress` },
        name,
      ),
    );
  }
  card.appendChild(row);
  return card;
}

interface PrRow {
  t: number;
  id: string;
  name: string;
  meta: string;
}

/** First-log + best-e1RM rows for one exercise's completed sets. */
function exercisePrRows(
  exerciseId: string,
  list: WorkoutSet[],
  byId: Map<string, Exercise>,
  units: Units,
): PrRow[] {
  const name = byId.get(exerciseId)?.name ?? exerciseId;
  const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
  const first = sorted[0];
  const rows: PrRow[] = [];
  if (first)
    rows.push({
      t: first.createdAt,
      id: exerciseId,
      name,
      meta: `first log ${formatWeight(first.weightKg, units)} × ${first.reps} (${fmtDate(first.createdAt)})`,
    });
  const best = sessionBestE1RM(list);
  if (best > 0) {
    const bestSet = sorted.reduce((a, b) =>
      b.weightKg * (1 + b.reps / 30) > a.weightKg * (1 + a.reps / 30) ? b : a,
    );
    rows.push({
      t: bestSet.createdAt,
      id: exerciseId,
      name,
      meta: `best e1RM ${formatWeight(best, units)} (${fmtDate(bestSet.createdAt)})`,
    });
  }
  return rows;
}

/** PR feed: first log + best e1RM per exercise, most recent first. */
function prFeedCard(
  sets: WorkoutSet[],
  byId: Map<string, Exercise>,
  units: Units,
): HTMLElement {
  const feed = h("div", { class: "card" }, h("strong", {}, "Personal records"));
  const rows = [...groupByExercise(sets).entries()]
    .flatMap(([exerciseId, list]) => exercisePrRows(exerciseId, list, byId, units))
    .sort((a, b) => b.t - a.t);
  if (rows.length === 0)
    feed.appendChild(h("p", { class: "muted" }, "No PRs yet — finish a workout."));
  else {
    const ul = h("ul", { class: "pr-list" });
    for (const r of rows.slice(0, 30)) ul.appendChild(drillRow(r.id, r.name, r.meta));
    feed.appendChild(ul);
  }
  return feed;
}

/** Per-exercise best-e1RM table, tap-through. */
function bestTableCard(
  sets: WorkoutSet[],
  exercises: Exercise[],
  units: Units,
): HTMLElement {
  const byExercise = groupByExercise(sets);
  const table = h(
    "div",
    { class: "card" },
    h("strong", {}, "Best estimated 1RM by exercise"),
  );
  const ul = h("ul", { class: "recovery-list" });
  for (const ex of exercises.filter((e) => !e.isArchived)) {
    const best = sessionBestE1RM(byExercise.get(ex.id) ?? []);
    if (best <= 0) continue;
    ul.appendChild(drillRow(ex.id, ex.name, formatWeight(best, units)));
  }
  if (ul.childElementCount === 0)
    ul.appendChild(h("li", {}, "Log weighted sets to populate."));
  table.appendChild(ul);
  return table;
}

/** Progress tab: consistency → muscle split → volume → picker → PRs → bests. */
export async function renderProgress(): Promise<HTMLElement> {
  const root = h("div", {});
  const settings = await loadSettings();
  const units: Units = settings.units;
  const [sets, workouts, exercises] = await Promise.all([
    allCompletedSets(),
    listWorkouts("completed", 500),
    listExercises(true),
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));

  root.appendChild(renderConsistencyCard(consistencyStats(workouts.map((w) => w.startedAt), Date.now())));
  root.appendChild(renderMuscleSplitCard(sets, byId, units));

  // Aggregate volume series per workout (existing hand-rolled chart).
  const setsByWorkout = groupByWorkout(sets);
  const points = workouts
    .map((w) => ({
      t: w.startedAt,
      volume: sessionVolume(setsByWorkout.get(w.id) ?? []),
    }))
    .sort((a, b) => a.t - b.t);
  root.appendChild(renderVolumeChart(points, units));

  root.appendChild(pickerCard(sets, byId));
  root.appendChild(prFeedCard(sets, byId, units));
  root.appendChild(bestTableCard(sets, exercises, units));
  return root;
}
