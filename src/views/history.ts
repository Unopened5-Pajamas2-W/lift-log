/** History: reverse-chron list, detail, post-hoc edit, delete, duplicate-as-template. */
import { renderSetRow } from "../components/setRow.ts";
import {
  deleteSet,
  deleteWorkout,
  getExercise,
  getSets,
  getWorkout,
  listWorkouts,
  loadSettings,
  saveTemplate,
  upsertSet,
  uuid,
} from "../lib/store.ts";
import { sessionBestE1RM, sessionVolume } from "../lib/metrics.ts";
import { checkPRs } from "../lib/metrics.ts";
import { getSetsForExercise } from "../lib/store.ts";
import { fmtDate, fmtDuration, fmtVolume, go, h, toast } from "../lib/ui.ts";

export async function renderHistory(detailId?: string): Promise<HTMLElement> {
  const root = h("div", {});
  const settings = await loadSettings();

  if (detailId) {
    const w = await getWorkout(detailId);
    if (!w) return h("div", { class: "card" }, "Workout not found.");
    const sets = await getSets(w.id);
    const card = h(
      "div",
      { class: "card" },
      h("strong", {}, w.title),
      h(
        "p",
        { class: "muted" },
        `${fmtDate(w.startedAt)} · ${w.endedAt ? fmtDuration(w.startedAt, w.endedAt) : "—"} · ${fmtVolume(sessionVolume(sets), settings.units)} volume`,
      ),
    );
    const groups = new Map<string, typeof sets>();
    for (const s of sets) {
      if (!groups.has(s.exerciseId)) groups.set(s.exerciseId, []);
      groups.get(s.exerciseId)?.push(s);
    }
    for (const [exerciseId, group] of groups) {
      const ex = await getExercise(exerciseId);
      const prev = (await getSetsForExercise(exerciseId)).filter(
        (s) => s.completed && s.workoutId !== w.id,
      );
      const prevBest = sessionBestE1RM(prev);
      const curBest = sessionBestE1RM(group);
      const pr = checkPRs(
        curBest,
        sessionVolume(group),
        prevBest,
        sessionVolume(prev),
      );
      const blockHeader = h(
        "div",
        { class: "row" },
        h("strong", { class: "grow" }, ex?.name ?? exerciseId),
        pr.e1rmPR ? h("span", { class: "pr-badge" }, "PR") : "",
      );
      if (ex) {
        blockHeader.appendChild(
          h(
            "button",
            {
              "aria-label": `View ${ex.name} instructions`,
              onclick: () => go(`/exercises/${encodeURIComponent(ex.id)}`),
            },
            "ⓘ Info",
          ),
        );
      }
      const block = h("div", { class: "card" }, blockHeader);
      const table = h("table", { class: "set-table" });
      table.appendChild(h("caption", { class: "sr-only" }, "Logged sets"));
      const historyBody = h("tbody", {});
      group
        .sort((a, b) => a.order - b.order)
        .forEach((s, i) => {
          historyBody.appendChild(
            renderSetRow({
              set: s,
              index: i + 1,
              units: settings.units,
              onChange: async (next) => {
                await upsertSet(next);
                go(`/history/${w.id}`); // re-render recomputes derived stats
              },
              onDelete: async () => {
                await deleteSet(s.id);
                go(`/history/${w.id}`);
              },
            }),
          );
        });
      table.appendChild(historyBody);
      block.appendChild(h("div", { class: "table-wrap" }, table));
      card.appendChild(block);
    }
    card.appendChild(
      h(
        "div",
        { class: "row" },
        h("button", { onclick: () => go("/history") }, "Back"),
        h(
          "button",
          {
            onclick: async () => {
              const name = window.prompt(
                "Template name:",
                `${w.title} template`,
              );
              if (!name) return;
              const items = [...groups.entries()].map(([exerciseId, g]) => ({
                exerciseId,
                // Templates stay working-sets-only: warmups never carry over.
                sets: g
                  .filter((s) => s.isWarmup !== true)
                  .map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
              }));
              await saveTemplate({
                id: uuid(),
                name,
                items,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
              toast("Template saved");
            },
          },
          "Save as template",
        ),
        h(
          "button",
          {
            class: "danger",
            onclick: async () => {
              if (!window.confirm("Delete this workout and its sets?")) return;
              await deleteWorkout(w.id);
              go("/history");
            },
          },
          "Delete",
        ),
      ),
    );
    root.appendChild(card);
    return root;
  }

  const done = await listWorkouts("completed", 200);
  if (done.length === 0) {
    return h(
      "div",
      { class: "card" },
      h("p", {}, "No workouts yet."),
      h(
        "button",
        { class: "primary", onclick: () => go("/today") },
        "Start your first workout",
      ),
    );
  }
  let shown = 50;
  const list = h("div", {});
  async function draw(): Promise<void> {
    list.replaceChildren();
    for (const w of done.slice(0, shown)) {
      const sets = await getSets(w.id);
      list.appendChild(
        h(
          "div",
          { class: "card row" },
          h(
            "span",
            { class: "grow" },
            h("strong", {}, w.title),
            h(
              "div",
              { class: "muted" },
              `${fmtDate(w.startedAt)} · ${w.endedAt ? fmtDuration(w.startedAt, w.endedAt) : "—"} · ${fmtVolume(sessionVolume(sets), settings.units)}`,
            ),
          ),
          h(
            "button",
            {
              "aria-label": `Open ${w.title}`,
              onclick: () => go(`/history/${w.id}`),
            },
            "Open",
          ),
        ),
      );
    }
    if (done.length > shown) {
      list.appendChild(
        h(
          "button",
          {
            onclick: () => {
              shown += 50;
              void draw();
            },
          },
          `Load more (${done.length - shown} left)`,
        ),
      );
    }
  }
  root.appendChild(list);
  await draw();
  return root;
}
