/** Progress: PR feed, volume chart, per-exercise bests. */
import { renderVolumeChart } from "../components/volumeChart.ts";
import { allCompletedSets, listExercises, listWorkouts } from "../lib/store.ts";
import { sessionBestE1RM, sessionVolume } from "../lib/metrics.ts";
import { formatWeight } from "../lib/units.ts";
import { loadSettings } from "../lib/store.ts";
import { fmtDate, h } from "../lib/ui.ts";

export async function renderProgress(): Promise<HTMLElement> {
  const root = h("div", {});
  const settings = await loadSettings();
  const [sets, workouts, exercises] = await Promise.all([
    allCompletedSets(),
    listWorkouts("completed", 500),
    listExercises(true),
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));

  // Volume series per workout.
  const setsByWorkout = new Map<string, typeof sets>();
  for (const s of sets) {
    if (!setsByWorkout.has(s.workoutId)) setsByWorkout.set(s.workoutId, []);
    setsByWorkout.get(s.workoutId)?.push(s);
  }
  const points = workouts
    .map((w) => ({
      t: w.startedAt,
      volume: sessionVolume(setsByWorkout.get(w.id) ?? []),
    }))
    .sort((a, b) => a.t - b.t);
  root.appendChild(renderVolumeChart(points, settings.units));

  // PR feed: first log + best e1RM per exercise, most recent first.
  const byExercise = new Map<string, typeof sets>();
  for (const s of sets) {
    if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
    byExercise.get(s.exerciseId)?.push(s);
  }
  const feed = h("div", { class: "card" }, h("strong", {}, "Personal records"));
  const rows: { t: number; text: string }[] = [];
  for (const [exerciseId, list] of byExercise) {
    const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
    const first = sorted[0];
    if (first) {
      rows.push({
        t: first.createdAt,
        text: `${byId.get(exerciseId)?.name ?? exerciseId}: first log ${formatWeight(first.weightKg, settings.units)} × ${first.reps} (${fmtDate(first.createdAt)})`,
      });
    }
    const best = sessionBestE1RM(list);
    if (best > 0) {
      const bestSet = sorted.reduce((a, b) =>
        b.weightKg * (1 + b.reps / 30) > a.weightKg * (1 + a.reps / 30) ? b : a,
      );
      rows.push({
        t: bestSet.createdAt,
        text: `${byId.get(exerciseId)?.name ?? exerciseId}: best e1RM ${formatWeight(best, settings.units)} (${fmtDate(bestSet.createdAt)})`,
      });
    }
  }
  rows.sort((a, b) => b.t - a.t);
  if (rows.length === 0)
    feed.appendChild(
      h("p", { class: "muted" }, "No PRs yet — finish a workout."),
    );
  else {
    const ul = h("ul", { class: "pr-list" });
    for (const r of rows.slice(0, 30)) {
      const sep = r.text.indexOf(": ");
      if (sep < 0) {
        ul.appendChild(h("li", {}, r.text));
        continue;
      }
      ul.appendChild(
        h(
          "li",
          {},
          h("span", {}, r.text.slice(0, sep)),
          h("span", { class: "pr-meta" }, r.text.slice(sep + 2)),
        ),
      );
    }
    feed.appendChild(ul);
  }
  root.appendChild(feed);

  // Per-exercise best table.
  const table = h(
    "div",
    { class: "card" },
    h("strong", {}, "Best estimated 1RM by exercise"),
  );
  const ul = h("ul", { class: "recovery-list" });
  for (const ex of exercises.filter((e) => !e.isArchived)) {
    const list = byExercise.get(ex.id) ?? [];
    if (list.length === 0) continue;
    const best = sessionBestE1RM(list);
    if (best <= 0) continue;
    ul.appendChild(
      h(
        "li",
        {},
        h("span", {}, ex.name),
        h("span", {}, formatWeight(best, settings.units)),
      ),
    );
  }
  if (ul.childElementCount === 0)
    ul.appendChild(h("li", {}, "Log weighted sets to populate."));
  table.appendChild(ul);
  root.appendChild(table);
  return root;
}
