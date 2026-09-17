/** Active-workout logger: grouped sets, steppers, add/remove, timer, finish/discard. */
import { renderRestTimer } from "../components/restTimer.ts";
import { renderSetRow } from "../components/setRow.ts";
import {
  deleteSet,
  discardWorkout,
  finishWorkout,
  getActiveWorkout,
  getExercise,
  getSets,
  getWorkout,
  listExercises,
  loadSettings,
  saveSettings,
  getSetsForExercise,
  upsertSet,
  uuid,
} from "../lib/store.ts";
import { suggestNextWeight } from "../lib/suggest.ts";
import type { WorkoutSet } from "../lib/types.ts";
import { displayWeight } from "../lib/units.ts";
import { go, h, toast } from "../lib/ui.ts";

async function suggestionFor(
  exerciseId: string,
  primaryMuscle: string,
): Promise<number | undefined> {
  try {
    const history = (await getSetsForExercise(exerciseId)).filter(
      (s) => s.completed,
    );
    if (history.length === 0) return undefined;
    const settings = await loadSettings();
    return suggestNextWeight(history, primaryMuscle as "chest", settings.units)
      .weightKg;
  } catch {
    return undefined;
  }
}

export async function renderWorkout(id?: string): Promise<HTMLElement> {
  const root = h("div", {});
  const workout = id ? await getWorkout(id) : await getActiveWorkout();
  if (!workout || workout.status !== "active") {
    return h(
      "div",
      { class: "card" },
      h("p", {}, "No active workout."),
      h(
        "button",
        { class: "primary", onclick: () => go("/today") },
        "Go to Today",
      ),
    );
  }
  const settings = await loadSettings();
  const workoutId = workout.id;
  const sets = await getSets(workoutId);

  root.appendChild(
    h(
      "header",
      { class: "topbar" },
      h("h1", {}, workout.title),
      h(
        "span",
        { class: "muted" },
        `${sets.filter((s) => s.completed).length}/${sets.length} sets`,
      ),
    ),
  );

  // Group sets by exercise, preserving first-seen order.
  const groups = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    if (!groups.has(s.exerciseId)) groups.set(s.exerciseId, []);
    groups.get(s.exerciseId)?.push(s);
  }

  for (const [exerciseId, group] of groups) {
    const ex = await getExercise(exerciseId);
    const name = ex?.name ?? "Unknown exercise";
    const card = h("div", { class: "card" }, h("strong", {}, name));
    const table = h("table", {
      class: "set-table",
      "aria-label": `${name} sets`,
    });
    table.appendChild(
      h(
        "tr",
        {},
        h("th", {}, "#"),
        h("th", {}, `Wt (${settings.units})`),
        h("th", {}, "Reps"),
        h("th", {}, "Done"),
        h("th", {}, ""),
      ),
    );
    const sugg = ex
      ? await suggestionFor(exerciseId, ex.primaryMuscle)
      : undefined;
    group
      .sort((a, b) => a.order - b.order)
      .forEach((s, i) => {
        table.appendChild(
          renderSetRow({
            set: s,
            index: i + 1,
            units: settings.units,
            suggestionKg: sugg,
            onChange: async (next) => {
              await upsertSet(next);
              // Clear recovery override for trained muscles on new completion.
              if (next.completed && !s.completed && ex) {
                const ov = { ...settings.recoveryOverrides };
                let changed = false;
                for (const m of [ex.primaryMuscle, ...ex.secondaryMuscles]) {
                  if (ov[m] != null) {
                    ov[m] = null;
                    changed = true;
                  }
                }
                if (changed) await saveSettings({ recoveryOverrides: ov });
              }
              refresh();
            },
            onDelete: async () => {
              await deleteSet(s.id);
              refresh();
            },
          }),
        );
      });
    card.appendChild(table);
    card.appendChild(
      h(
        "div",
        { class: "row" },
        h(
          "button",
          {
            "aria-label": `Add set to ${name}`,
            onclick: async () => {
              const last = group[group.length - 1];
              const weightKg = last?.weightKg ?? sugg ?? 20;
              const reps = last?.reps ?? 8;
              const order = sets.reduce((m, x) => Math.max(m, x.order), -1) + 1;
              await upsertSet({
                id: uuid(),
                workoutId: workout.id,
                exerciseId,
                order,
                weightKg,
                reps,
                completed: false,
                createdAt: Date.now(),
              });
              refresh();
            },
          },
          "+ Add set",
        ),
        h(
          "button",
          {
            "aria-label": `Remove ${name} from workout`,
            onclick: async () => {
              if (!window.confirm(`Remove ${name} and its sets?`)) return;
              for (const s of group) await deleteSet(s.id);
              refresh();
            },
          },
          "Remove",
        ),
      ),
    );
    if (sugg != null) {
      card.appendChild(
        h(
          "p",
          { class: "muted" },
          `Suggested: ${displayWeight(sugg, settings.units)} ${settings.units} (tap ✓ on a set to apply).`,
        ),
      );
    }
    root.appendChild(card);
  }

  // Add exercise.
  const addCard = h("div", { class: "card" }, h("strong", {}, "Add exercise"));
  const sel = h("select", {
    "aria-label": "Choose exercise to add",
  }) as HTMLSelectElement;
  for (const e of await listExercises(false)) {
    const o = document.createElement("option");
    o.value = e.id;
    o.textContent = `${e.name} (${e.equipment})`;
    sel.appendChild(o);
  }
  addCard.appendChild(
    h(
      "div",
      { class: "row" },
      sel,
      h(
        "button",
        {
          onclick: async () => {
            const order =
              (await getSets(workout.id)).reduce(
                (m, x) => Math.max(m, x.order),
                -1,
              ) + 1;
            await upsertSet({
              id: uuid(),
              workoutId: workout.id,
              exerciseId: sel.value,
              order,
              weightKg: 20,
              reps: 8,
              completed: false,
              createdAt: Date.now(),
            });
            refresh();
          },
        },
        "Add",
      ),
    ),
  );
  root.appendChild(addCard);
  root.appendChild(
    renderRestTimer(
      settings.restSeconds,
      (s) => void saveSettings({ restSeconds: s }),
    ),
  );

  const actions = h(
    "div",
    { class: "sticky-actions" },
    h(
      "button",
      {
        class: "primary grow",
        onclick: async () => {
          await finishWorkout(workout.id);
          toast("Workout saved. Nice work!");
          go("/history");
        },
      },
      "Finish",
    ),
    h(
      "button",
      {
        class: "danger",
        onclick: async () => {
          if (
            !window.confirm(
              "Discard this workout? Logged sets will be marked discarded.",
            )
          )
            return;
          await discardWorkout(workout.id);
          go("/today");
        },
      },
      "Discard",
    ),
  );
  root.appendChild(actions);

  window.onbeforeunload = (e) => {
    e.preventDefault();
  };

  function refresh(): void {
    window.onbeforeunload = null;
    go(`/workout/${workoutId}`);
  }
  return root;
}
