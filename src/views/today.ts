/** Today: recovery summary, program session, weekly check-in, generate, resume. */
import { renderRecoveryMap } from "../components/recoveryMap.ts";
import { ALL_EQUIPMENT } from "../data/muscles.ts";
import type { MuscleGroup } from "../lib/types.ts";
import {
  getActiveWorkout,
  getProgram,
  listWorkouts,
  loadSettings,
  saveSettings,
  allCompletedSets,
  startWorkout,
} from "../lib/store.ts";
import { generateWorkout } from "../lib/suggest.ts";
import { listExercises } from "../lib/store.ts";
import { recoveryMap } from "../lib/recovery.ts";
import {
  describePrescription,
  expandProgramDay,
  nextProgramSession,
  type ExpandContext,
} from "../lib/programs.ts";
import { buildExpandContext } from "../lib/sessionContext.ts";
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

  // --- Program card (v2): next scheduled session of the active program ---
  if (settings.activeProgramId) {
    const program = await getProgram(settings.activeProgramId);
    if (!program) {
      // Locked edge case: deleted program while active — explicit card, no
      // silent fallback to the generator.
      root.appendChild(
        h(
          "div",
          { class: "card" },
          h("strong", {}, "Program unavailable"),
          h("p", { class: "muted" }, "The active program no longer exists."),
          h(
            "button",
            {
              onclick: async () => {
                try {
                  await saveSettings({ activeProgramId: undefined });
                  go("/today");
                } catch (err) {
                  console.error(err);
                  toast("Couldn't deactivate — storage unavailable. Retry.");
                }
              },
            },
            "Deactivate",
          ),
        ),
      );
    } else if (program.isArchived) {
      // Archived programs stop scheduling but stay deactivatable.
      root.appendChild(
        h(
          "div",
          { class: "card" },
          h("strong", {}, `${program.name} (archived)`),
          h(
            "button",
            {
              onclick: async () => {
                try {
                  await saveSettings({ activeProgramId: undefined });
                  go("/today");
                } catch (err) {
                  console.error(err);
                  toast("Couldn't deactivate — storage unavailable. Retry.");
                }
              },
            },
            "Deactivate",
          ),
        ),
      );
    } else if ((program.weeks[0]?.days.length ?? 0) === 0) {
      root.appendChild(
        h(
          "div",
          { class: "card" },
          h("strong", {}, program.name),
          h("p", { class: "muted" }, "This program has no days yet."),
          h("button", { onclick: () => go(`/programs/${program.id}`) }, "Edit"),
        ),
      );
    } else {
      const completed = (await listWorkouts("completed", 1000)).filter(
        (w) => w.programId === program.id,
      );
      const slot = nextProgramSession(program, completed);
      const day = program.weeks[slot.weekIndex]?.days[slot.dayIndex];
      if (day) {
        const now = Date.now();
        // One autoregulated expansion drives both the preview and the
        // prefill: phase transforms (§8.3/§8.5), engine suggestions (§6.3),
        // e1RM-anchored percent gauges (§6.5), RPE corrections (§2.3).
        const context: ExpandContext = {
          ...(await buildExpandContext({
            units: settings.units,
            exerciseById: byId,
            exerciseIds: day.items.map((it) => it.exerciseId),
            now,
          })),
          phase: program.weeks[slot.weekIndex]?.phase,
          deloadActive: (settings.deloadUntil ?? 0) > now,
        };
        const expanded = expandProgramDay(day, context);
        const resolved = new Map(expanded.map((e) => [e.exerciseId, e]));
        root.appendChild(
          h(
            "div",
            { class: "card" },
            h("strong", {}, program.name),
            h(
              "p",
              { class: "muted" },
              `${
                slot.cycleComplete
                  ? `Cycle ${slot.cycleCount + 1} begins — Week 1 Day 1`
                  : `Week ${slot.weekIndex + 1} · Day ${slot.dayIndex + 1}`
              } — ${day.name}${
                context.deloadActive ? " · deload: sets −40%" : ""
              }`,
            ),
            h(
              "ul",
              {},
              ...day.items.map((it) => {
                const e = resolved.get(it.exerciseId);
                const name = byId.get(it.exerciseId)?.name;
                if (!e || !name)
                  return h("li", { class: "muted" }, `${name ?? it.exerciseId} — skipped (unresolvable)`);
                const line = describePrescription(e, settings.units);
                return h("li", {}, line ? `${name} — ${line}` : name);
              }),
            ),
            h(
              "button",
              {
                class: "primary",
                onclick: async (e) => {
                  const btn = e.currentTarget as HTMLButtonElement | null;
                  btn?.setAttribute("disabled", "true");
                  try {
                    const w = await startWorkout({
                      title: `${program.name} — ${day.name}`,
                      programId: program.id,
                      programWeek: slot.weekIndex,
                      programDayIndex: slot.dayIndex,
                      items: expanded.map((e) => ({
                        exerciseId: e.exerciseId,
                        sets: e.sets,
                      })),
                    });
                    go(`/workout/${w.id}`);
                  } catch (err) {
                    console.error(err);
                    btn?.removeAttribute("disabled");
                    toast("Couldn't start session — storage unavailable. Retry.");
                  }
                },
              },
              "Start session",
            ),
          ),
        );
      }
    }
  }

  // --- §8.3 weekly self-check: 2+ yes → deload week (sets −40%, loads kept) ---
  const nowTs = Date.now();
  if (!settings.lastCheckIn || nowTs - settings.lastCheckIn.at > 7 * 86_400_000) {
    const questions = [
      "Dreading the gym",
      "Sleep worse than usual",
      "Loads or reps decreasing",
      "Life stress worse than usual",
      "Aches worse than usual",
    ];
    const boxes: HTMLInputElement[] = [];
    const list = h("ul", {});
    for (const q of questions) {
      const box = h("input", { type: "checkbox" }) as HTMLInputElement;
      boxes.push(box);
      list.appendChild(h("li", {}, h("label", {}, box, " ", q)));
    }
    root.appendChild(
      h(
        "div",
        { class: "card" },
        h("strong", {}, "Weekly check-in"),
        h(
          "p",
          { class: "muted" },
          "Rate the past week. 2+ yes → run a deload week.",
        ),
        list,
        h(
          "button",
          {
            onclick: async (e) => {
              const btn = e.currentTarget as HTMLButtonElement | null;
              btn?.setAttribute("disabled", "true");
              const yesCount = boxes.filter((b) => b.checked).length;
              try {
                await saveSettings({
                  lastCheckIn: { at: nowTs, yesCount },
                  ...(yesCount >= 2
                    ? { deloadUntil: nowTs + 7 * 86_400_000 }
                    : {}),
                });
                toast(
                  yesCount >= 2
                    ? "Deload week started — sets cut ~40%, loads kept."
                    : "Check-in saved — keep going.",
                );
                go("/today");
              } catch (err) {
                console.error(err);
                btn?.removeAttribute("disabled");
                toast("Couldn't save — storage unavailable. Retry.");
              }
            },
          },
          "Save check-in",
        ),
      ),
    );
  } else if ((settings.deloadUntil ?? 0) > nowTs) {
    root.appendChild(
      h(
        "div",
        { class: "card" },
        h("strong", {}, "Deload week active"),
        h(
          "p",
          { class: "muted" },
          "Scheduled sessions run with ~40% fewer sets; loads, RPE and frequency stay.",
        ),
      ),
    );
  }

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
