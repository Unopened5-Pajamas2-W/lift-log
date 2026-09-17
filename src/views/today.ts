/** Today: recovery summary, generate workout, start/resume, backup nudge. */
import { renderRecoveryMap } from "../components/recoveryMap.ts";
import { ALL_EQUIPMENT } from "../data/muscles.ts";
import type { MuscleGroup } from "../lib/types.ts";
import {
  getActiveWorkout,
  listWorkouts,
  loadSettings,
  saveSettings,
  allCompletedSets,
  startWorkout,
} from "../lib/store.ts";
import { generateWorkout } from "../lib/suggest.ts";
import { listExercises } from "../lib/store.ts";
import { recoveryMap } from "../lib/recovery.ts";
import { randomSeed } from "../lib/rng.ts";
import { go, h, toast } from "../lib/ui.ts";

export async function renderToday(): Promise<HTMLElement> {
  const root = h("div", {});
  root.appendChild(
    h("p", { class: "muted" }, "Recover, generate, lift — all offline."),
  );
  const settings = await loadSettings();
  const [sets, exercises] = await Promise.all([
    allCompletedSets(),
    listExercises(true),
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const map = recoveryMap(
    sets.map((s) => ({ set: s, exercise: byId.get(s.exerciseId) })),
    settings.recoveryOverrides,
  );
  const card = h("div", { class: "card" }, h("strong", {}, "Recovery"));
  card.appendChild(
    renderRecoveryMap(map, async (m: MuscleGroup, v: number | null) => {
      try {
        await saveSettings({
          recoveryOverrides: { ...settings.recoveryOverrides, [m]: v },
        });
        go("/today");
      } catch (err) {
        console.error(err);
        toast("Couldn't save — storage unavailable. Retry.");
      }
    }),
  );
  root.appendChild(card);

  const active = await getActiveWorkout();
  if (active) {
    root.appendChild(
      h(
        "div",
        { class: "card" },
        h("strong", {}, `Resume: ${active.title}`),
        h(
          "div",
          { class: "row" },
          h(
            "button",
            { class: "primary", onclick: () => go(`/workout/${active.id}`) },
            "Resume workout",
          ),
        ),
      ),
    );
  }

  // Generator
  const gen = h("div", { class: "card" }, h("strong", {}, "Generate workout"));
  const durSel = h("select", {
    "aria-label": "Target duration",
  }) as HTMLSelectElement;
  for (const d of [20, 30, 45, 60]) {
    const o = document.createElement("option");
    o.value = String(d);
    o.textContent = `${d} min`;
    if (d === 45) o.selected = true;
    durSel.appendChild(o);
  }
  const focusSel = h("select", {
    "aria-label": "Workout focus",
  }) as HTMLSelectElement;
  for (const f of ["full-body", "upper", "lower", "push", "pull"]) {
    const o = document.createElement("option");
    o.value = f;
    o.textContent = f;
    focusSel.appendChild(o);
  }
  const preview = h("div", {});
  gen.append(
    h(
      "div",
      { class: "row" },
      h("label", {}, "Duration", durSel),
      h("label", {}, "Focus", focusSel),
    ),
    h(
      "div",
      { class: "row" },
      h(
        "button",
        {
          onclick: async () => {
            const lib = (await listExercises(false)).filter(
              (e) =>
                settings.equipment.includes(e.equipment) ||
                e.equipment === "bodyweight",
            );
            const completed = await allCompletedSets();
            const lastPerf = new Map<
              string,
              {
                weightKg: number;
                reps: number;
                completed: boolean;
                createdAt: number;
                workoutId: string;
                isWarmup?: boolean;
              }[]
            >();
            const lastDone = new Map<string, number>();
            for (const s of completed) {
              if (!lastPerf.has(s.exerciseId)) lastPerf.set(s.exerciseId, []);
              lastPerf.get(s.exerciseId)?.push(s);
              lastDone.set(
                s.exerciseId,
                Math.max(lastDone.get(s.exerciseId) ?? 0, s.createdAt),
              );
            }
            // Flat lifetime history per exercise; suggest.ts groups it into
            // sessions internally (recent-window baseline, warmups ignored).
            const { items, explanations } = generateWorkout({
              durationMin: Number(durSel.value) as 20 | 30 | 45 | 60,
              focus: focusSel.value as
                "full-body" | "upper" | "lower" | "push" | "pull",
              equipment:
                settings.equipment.length > 0
                  ? settings.equipment
                  : [...ALL_EQUIPMENT],
              recovery: map,
              library: lib,
              lastPerformance: lastPerf,
              lastDoneAt: lastDone,
              seed: randomSeed(),
              units: settings.units,
            });
            preview.replaceChildren();
            if (items.length === 0) {
              preview.appendChild(
                h(
                  "p",
                  { class: "muted" },
                  "No fresh exercises match — try allowing fatigued muscles or adding equipment.",
                ),
              );
              return;
            }
            const ul = h("ul", {});
            explanations.forEach((e) => ul.appendChild(h("li", {}, e)));
            preview.append(
              ul,
              h(
                "button",
                {
                  class: "primary",
                  onclick: async (e) => {
                    const btn = e.currentTarget as HTMLButtonElement | null;
                    btn?.setAttribute("disabled", "true");
                    try {
                      const w = await startWorkout({
                        title: `Suggested ${focusSel.value}`,
                        seed: randomSeed(),
                        items: items.map((i) => ({
                          exerciseId: i.exerciseId,
                          sets: i.sets,
                        })),
                      });
                      go(`/workout/${w.id}`);
                    } catch (err) {
                      console.error(err);
                      btn?.removeAttribute("disabled");
                      toast(
                        "Couldn't start workout — storage unavailable. Retry.",
                      );
                    }
                  },
                },
                `Start (${items.length} exercises)`,
              ),
            );
          },
        },
        "Generate",
      ),
      h(
        "button",
        {
          onclick: async (e) => {
            const btn = e.currentTarget as HTMLButtonElement | null;
            btn?.setAttribute("disabled", "true");
            try {
              const w = await startWorkout({ title: "Empty workout" });
              go(`/workout/${w.id}`);
            } catch (err) {
              console.error(err);
              btn?.removeAttribute("disabled");
              toast("Couldn't start workout — storage unavailable. Retry.");
            }
          },
        },
        "Start empty",
      ),
    ),
    preview,
  );
  root.appendChild(gen);

  // Backup nudge every 5th completed workout.
  const done = await listWorkouts("completed", 1000);
  if (done.length > 0 && done.length % 5 === 0) {
    root.appendChild(
      h(
        "div",
        { class: "card" },
        h("strong", {}, "Backup reminder"),
        h(
          "p",
          { class: "muted" },
          `You've logged ${done.length} workouts. iOS can evict site data — export a backup in Settings.`,
        ),
        h("button", { onclick: () => go("/settings") }, "Open Settings"),
      ),
    );
  }
  return root;
}
