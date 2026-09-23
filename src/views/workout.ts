/** Active-workout logger: in-place row patches (no per-tap re-navigation),
 *  suggestion-prefilled new sets, auto-start rest timer, rollback on failure. */
import {
  renderRestTimer,
  type RestTimerHandle,
} from "../components/restTimer.ts";
import { renderSetRow } from "../components/setRow.ts";
import { openExerciseInfo } from "../components/exerciseInfo.ts";
import { openSubstituteSheet } from "../components/substituteSheet.ts";
import {
  allCompletedSets,
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
import {
  rankSubstitutes,
  suggestNextWeight,
  buildWarmupSets,
} from "../lib/suggest.ts";
import { recoveryMap } from "../lib/recovery.ts";
import { ensureAudio } from "../lib/timer.ts";
import { plateBreakdown, formatPlateLine } from "../lib/plates.ts";
import type { Exercise, MuscleGroup, WorkoutSet } from "../lib/types.ts";
import { displayWeight } from "../lib/units.ts";
import { go, h, toast } from "../lib/ui.ts";

async function suggestionFor(
  exerciseId: string,
  primaryMuscle: MuscleGroup,
): Promise<number | undefined> {
  try {
    const history = (await getSetsForExercise(exerciseId)).filter(
      (s) => s.completed,
    );
    if (history.length === 0) return undefined;
    const settings = await loadSettings();
    return suggestNextWeight(history, primaryMuscle, settings.units).weightKg;
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

  // In-place state: the row DOM is patched per mutation, never re-navigated.
  const setsById = new Map<string, WorkoutSet>(sets.map((s) => [s.id, s]));
  const groupsByEx = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const g = groupsByEx.get(s.exerciseId);
    if (g) g.push(s);
    else groupsByEx.set(s.exerciseId, [s]);
  }
  const cardsByEx = new Map<string, HTMLElement>();
  const rowById = new Map<string, HTMLElement>();
  /** exerciseId → primary muscle (drives first-per-muscle warmups). */
  const muscleByEx = new Map<string, MuscleGroup>();

  const counterSpan = h("span", { class: "muted" }, "");
  function updateCounter(): void {
    let done = 0;
    for (const s of setsById.values()) if (s.completed) done++;
    counterSpan.textContent = `${done}/${setsById.size} sets`;
  }
  updateCounter();

  root.appendChild(
    h("header", { class: "topbar" }, h("h1", {}, workout.title), counterSpan),
  );

  // Rest timer under the header, sticky (see .rest-sticky in styles.css).
  const rest: RestTimerHandle = renderRestTimer(settings.restSeconds, (s) => {
    saveSettings({ restSeconds: s }).catch((err: unknown) => {
      console.error(err);
      toast("Couldn't save rest default — storage unavailable.");
    });
  });
  rest.element.classList.add("rest-sticky");
  root.appendChild(rest.element);

  function nextOrder(): number {
    let max = -1;
    for (const s of setsById.values()) max = Math.max(max, s.order);
    return max + 1;
  }

  function focusControl(scope: HTMLElement, key: string): void {
    scope.querySelector<HTMLElement>(`[data-focus-key="${key}"]`)?.focus();
  }

  /** Re-render one row in place; restore focus to the same control if it was
   *  inside the old row (same tick — async focus loses VoiceOver context). */
  function patchRow(
    set: WorkoutSet,
    index: number,
    makeRow: (set: WorkoutSet, index: number) => HTMLElement,
  ): void {
    const oldRow = rowById.get(set.id);
    const active = document.activeElement;
    const focusKey =
      oldRow && active instanceof HTMLElement && oldRow.contains(active)
        ? active.getAttribute("data-focus-key")
        : null;
    const newRow = makeRow(set, index);
    rowById.set(set.id, newRow);
    if (oldRow) oldRow.replaceWith(newRow);
    if (focusKey) focusControl(newRow, focusKey);
  }

  /** Clear recovery overrides for trained muscles on a new completion.
   *  Best-effort with its own error path: the set itself already committed. */
  async function clearTrainedOverrides(
    ex: Exercise | undefined,
  ): Promise<void> {
    if (!ex) return;
    try {
      const ov = { ...settings.recoveryOverrides };
      let changed = false;
      for (const m of [ex.primaryMuscle, ...ex.secondaryMuscles]) {
        if (ov[m] != null) {
          ov[m] = null;
          changed = true;
        }
      }
      if (changed) await saveSettings({ recoveryOverrides: ov });
    } catch (err) {
      console.error(err);
      toast("Couldn't clear recovery override — storage unavailable.");
    }
  }

  /** Re-sync one exercise's group with what actually committed (used after a
   *  failed multi-set remove), then rebuild or drop its card. */
  async function resyncExercise(exerciseId: string): Promise<void> {
    const fresh = (await getSets(workoutId)).filter(
      (s) => s.exerciseId === exerciseId,
    );
    const old = groupsByEx.get(exerciseId) ?? [];
    const freshIds = new Set(fresh.map((s) => s.id));
    for (const s of old) if (!freshIds.has(s.id)) setsById.delete(s.id);
    for (const s of fresh) setsById.set(s.id, s);
    if (fresh.length === 0) groupsByEx.delete(exerciseId);
    else groupsByEx.set(exerciseId, fresh);
    updateCounter();
    const oldCard = cardsByEx.get(exerciseId);
    if (!groupsByEx.has(exerciseId)) {
      oldCard?.remove();
      cardsByEx.delete(exerciseId);
      return;
    }
    const freshCard = await buildExerciseCard(exerciseId);
    cardsByEx.set(exerciseId, freshCard);
    oldCard?.replaceWith(freshCard);
  }

  /**
   * Create, persist, and register an exercise's opening sets: suggested
   * working weight (R3 prefill), plus the warmup ramp when its primary muscle
   * hasn't been trained this session. Shared by Add and Swap. Throws on
   * storage failure (and for an unknown exercise) — caller owns rollback.
   */
  async function addExerciseSets(exerciseId: string): Promise<WorkoutSet[]> {
    const ex = await getExercise(exerciseId);
    if (!ex) throw new Error(`unknown exercise: ${exerciseId}`);
    const sugg = await suggestionFor(exerciseId, ex.primaryMuscle);
    const workingKg = sugg ?? 20;
    // First exercise per primary muscle opens with the warmup ramp.
    const unseenMuscle = ![...muscleByEx.values()].includes(ex.primaryMuscle);
    muscleByEx.set(exerciseId, ex.primaryMuscle);
    const nowTs = Date.now();
    let order = nextOrder();
    const rows: WorkoutSet[] = [];
    if (unseenMuscle) {
      for (const w of buildWarmupSets(workingKg)) {
        rows.push({
          id: uuid(),
          workoutId,
          exerciseId,
          order: order++,
          weightKg: w.weightKg,
          reps: w.reps,
          completed: false,
          isWarmup: true,
          createdAt: nowTs,
        });
      }
    }
    rows.push({
      id: uuid(),
      workoutId,
      exerciseId,
      order: order++,
      weightKg: workingKg, // R3 prefill
      reps: 8,
      completed: false,
      createdAt: nowTs,
    });
    for (const r of rows) await upsertSet(r);
    for (const r of rows) setsById.set(r.id, r);
    const existing = groupsByEx.get(exerciseId);
    if (existing) existing.push(...rows);
    else groupsByEx.set(exerciseId, [...rows]);
    updateCounter();
    return rows;
  }

  /**
   * Keep-done/swap-rest: delete the outgoing exercise's unlogged sets (never
   * its completed ones), then insert the substitute prefilled via
   * addExerciseSets. The substitute card takes the outgoing card's DOM
   * position; a card with surviving completed sets is rebuilt in place. On
   * any storage failure, resync both exercises from what actually persisted
   * (partial completion is acceptable; silent divergence is not).
   */
  async function swapExercise(
    exerciseId: string,
    newExerciseId: string,
  ): Promise<void> {
    const outgoing = await getExercise(exerciseId);
    const fresh = await getExercise(newExerciseId);
    if (!outgoing || !fresh) {
      toast("Exercise not found — reopen the workout and retry.");
      return;
    }
    const group = groupsByEx.get(exerciseId) ?? [];
    const unlogged = group.filter((s) => s.completed !== true);
    const workingCount = unlogged.filter((s) => s.isWarmup !== true).length;
    if (
      workingCount > 0 &&
      !window.confirm(
        `Discard ${workingCount} unfinished set${workingCount === 1 ? "" : "s"} of ${outgoing.name} and add ${fresh.name}?`,
      )
    )
      return;
    try {
      for (const s of unlogged) await deleteSet(s.id);
    } catch (err) {
      console.error(err);
      toast("Couldn't swap — storage unavailable. Retry.");
      await resyncExercise(exerciseId);
      return;
    }
    for (const s of unlogged) setsById.delete(s.id);
    const remaining = group.filter((s) => s.completed === true);
    if (remaining.length === 0) {
      groupsByEx.delete(exerciseId);
      // Muscle unseen again (and nothing logged): let a same-muscle
      // substitute still earn its warmup ramp.
      if (muscleByEx.get(exerciseId) === outgoing.primaryMuscle)
        muscleByEx.delete(exerciseId);
    } else {
      groupsByEx.set(exerciseId, remaining);
    }
    updateCounter();
    try {
      const rows = await addExerciseSets(newExerciseId);
      const oldCard = cardsByEx.get(exerciseId);
      const newCard = await buildExerciseCard(newExerciseId);
      cardsByEx.set(newExerciseId, newCard);
      if (remaining.length === 0) {
        cardsByEx.delete(exerciseId);
        if (oldCard) oldCard.replaceWith(newCard);
        else root.insertBefore(newCard, addCard); // E3: outgoing was last
      } else {
        const rebuilt = await buildExerciseCard(exerciseId);
        cardsByEx.set(exerciseId, rebuilt);
        if (oldCard) oldCard.replaceWith(rebuilt);
        else root.insertBefore(rebuilt, addCard);
        rebuilt.after(newCard);
      }
      const firstWorkingId = (
        rows.find((r) => r.isWarmup !== true) ?? rows[rows.length - 1]
      )?.id;
      if (firstWorkingId)
        focusControl(rowById.get(firstWorkingId) ?? newCard, "done");
      toast(`Swapped to ${fresh.name}.`);
    } catch (err) {
      console.error(err);
      toast("Couldn't swap — storage unavailable. Retry.");
      await resyncExercise(exerciseId);
      await resyncExercise(newExerciseId);
    }
  }

  /** Open the ranked substitute picker, then swap on selection. */
  async function beginSwap(exerciseId: string): Promise<void> {
    const outgoing = await getExercise(exerciseId);
    if (!outgoing) return;
    const completed = await allCompletedSets();
    const byId = new Map(
      (await listExercises(true)).map((e) => [e.id, e] as const),
    );
    const recovery = recoveryMap(
      completed.map((s) => ({
        set: s,
        exercise: byId.get(s.exerciseId),
      })),
      settings.recoveryOverrides,
    );
    const lastDoneAt = new Map<string, number>();
    for (const s of completed)
      lastDoneAt.set(
        s.exerciseId,
        Math.max(lastDoneAt.get(s.exerciseId) ?? 0, s.createdAt),
      );
    const candidates = rankSubstitutes({
      outgoing,
      library: [...byId.values()],
      ownedEquipment: settings.equipment,
      inWorkout: new Set(groupsByEx.keys()),
      recovery,
      lastDoneAt,
      now: Date.now(),
    });
    const rows = await Promise.all(
      candidates.map(async (c) => ({
        exercise: c.exercise,
        recoveryPct: recovery[c.exercise.primaryMuscle] ?? 100,
        suggestedKg: await suggestionFor(
          c.exercise.id,
          c.exercise.primaryMuscle,
        ),
      })),
    );
    const picked = await openSubstituteSheet({
      outgoingName: outgoing.name,
      rows,
      units: settings.units,
    });
    if (picked) await swapExercise(exerciseId, picked);
  }

  async function buildExerciseCard(exerciseId: string): Promise<HTMLElement> {
    const ex = await getExercise(exerciseId);
    if (ex) muscleByEx.set(exerciseId, ex.primaryMuscle);
    const name = ex?.name ?? "Unknown exercise";
    const group = groupsByEx.get(exerciseId) ?? [];
    const sugg = ex
      ? await suggestionFor(exerciseId, ex.primaryMuscle)
      : undefined;

    const card = h("div", { class: "card" });
    const header = h(
      "div",
      { class: "row" },
      h("strong", { class: "grow" }, name),
    );
    if (ex) {
      header.appendChild(
        h(
          "button",
          {
            "aria-label": `View ${name} instructions`,
            onclick: () => openExerciseInfo(ex),
          },
          "ⓘ Info",
        ),
      );
      const swapBtn = h(
        "button",
        {
          "aria-label": `Swap ${name} for a different exercise`,
          onclick: () => {
            swapBtn.setAttribute("disabled", "true"); // E10: one swap at a time
            void beginSwap(exerciseId).finally(() =>
              swapBtn.removeAttribute("disabled"),
            );
          },
        },
        "⇄ Swap",
      );
      header.appendChild(swapBtn);
    }
    card.appendChild(header);
    const table = h("table", { class: "set-table" });
    table.appendChild(h("caption", { class: "sr-only" }, `${name} sets`));
    table.appendChild(
      h(
        "thead",
        {},
        h(
          "tr",
          {},
          h("th", { scope: "col" }, "#"),
          h("th", { scope: "col" }, `Wt (${settings.units})`),
          h("th", { scope: "col" }, "Reps"),
          h("th", { scope: "col" }, "Done"),
          h("th", { scope: "col" }, h("span", { class: "sr-only" }, "Actions")),
        ),
      ),
    );
    const tbody = h("tbody", {});
    table.appendChild(tbody);
    card.appendChild(h("div", { class: "table-wrap" }, table));

    function makeRow(set: WorkoutSet, index: number): HTMLElement {
      return renderSetRow({
        set,
        index,
        units: settings.units,
        suggestionKg: sugg,
        showRpe: true,
        onChange: (next) => {
          // Sync within the tap's call stack: iOS unlocks audio by gesture only.
          if (next.completed && !set.completed) ensureAudio();
          void commitSet(set, next, index);
        },
        onDelete: () => void removeSet(set),
      });
    }

    function renderGroupRows(): void {
      for (const s of group) rowById.delete(s.id);
      const rows = group.map((s, i) => {
        const row = makeRow(s, i + 1);
        rowById.set(s.id, row);
        return row;
      });
      tbody.replaceChildren(...rows);
    }

    async function commitSet(
      prev: WorkoutSet,
      next: WorkoutSet,
      index: number,
    ): Promise<void> {
      try {
        await upsertSet(next);
        setsById.set(next.id, next);
        const gi = group.findIndex((s) => s.id === next.id);
        if (gi >= 0) group[gi] = next;
        updateCounter();
        if (next.completed && !prev.completed) {
          // Warmup completions persist like any set but never start the timer.
          if (next.isWarmup !== true) rest.start(settings.restSeconds); // restarts if already running (R4)
          void clearTrainedOverrides(ex);
        }
        if (next.completed !== prev.completed || next.rpe !== prev.rpe) patchRow(next, index, makeRow);
        // Weight/reps-only edits: inputs already show the values; touching the
        // DOM would drop the open keyboard, so leave the row alone.
      } catch (err) {
        console.error(err);
        toast("Couldn't save set — storage unavailable. Retry.");
        const lastCommitted = setsById.get(next.id) ?? prev;
        patchRow(lastCommitted, index, makeRow); // R9: revert honestly
      }
    }

    async function removeSet(set: WorkoutSet): Promise<void> {
      try {
        await deleteSet(set.id);
        setsById.delete(set.id);
        const gi = group.findIndex((s) => s.id === set.id);
        if (gi >= 0) group.splice(gi, 1);
        updateCounter();
        renderGroupRows(); // renumber the remaining rows
        focusControl(card, "add-set"); // R1: delete focuses Add-set
      } catch (err) {
        console.error(err);
        toast("Couldn't delete set — storage unavailable. Retry.");
      }
    }

    const addSetBtn = h(
      "button",
      {
        "aria-label": `Add set to ${name}`,
        "data-focus-key": "add-set",
        onclick: async () => {
          try {
            const last = group[group.length - 1];
            const weightKg = sugg ?? last?.weightKg ?? 20; // R3 prefill
            const reps = last?.reps ?? 8;
            const added: WorkoutSet = {
              id: uuid(),
              workoutId,
              exerciseId,
              order: nextOrder(),
              weightKg,
              reps,
              completed: false,
              createdAt: Date.now(),
            };
            await upsertSet(added);
            group.push(added);
            setsById.set(added.id, added);
            updateCounter();
            const row = makeRow(added, group.length);
            rowById.set(added.id, row);
            tbody.appendChild(row);
            focusControl(row, "done"); // open-question default: focus Done
          } catch (err) {
            console.error(err);
            toast("Couldn't add set — storage unavailable. Retry.");
          }
        },
      },
      "+ Add set",
    );
    card.appendChild(
      h(
        "div",
        { class: "row" },
        addSetBtn,
        h(
          "button",
          {
            "aria-label": `Remove ${name} from workout`,
            onclick: async () => {
              if (!window.confirm(`Remove ${name} and its sets?`)) return;
              try {
                for (const s of [...group]) await deleteSet(s.id);
                for (const s of group) setsById.delete(s.id);
                groupsByEx.delete(exerciseId);
                updateCounter();
                card.remove();
                cardsByEx.delete(exerciseId);
                focusControl(root, "add-exercise");
              } catch (err) {
                console.error(err);
                toast("Couldn't remove — storage unavailable. Retry.");
                await resyncExercise(exerciseId);
              }
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
          `Suggested: ${displayWeight(sugg, settings.units)} ${settings.units} — new sets start here.`,
        ),
      );
    }
    if (ex?.equipment === "barbell") {
      const workingKg =
        sugg ?? group.find((s) => s.isWarmup !== true)?.weightKg ?? 20;
      card.appendChild(
        h(
          "p",
          { class: "muted" },
          formatPlateLine(
            plateBreakdown(workingKg, settings.barWeightKg, settings.units),
            settings.units,
          ),
        ),
      );
    }
    renderGroupRows();
    return card;
  }

  for (const exerciseId of groupsByEx.keys()) {
    const card = await buildExerciseCard(exerciseId);
    cardsByEx.set(exerciseId, card);
    root.appendChild(card);
  }

  // Add exercise.
  const addCard = h("div", { class: "card" }, h("strong", {}, "Add exercise"));
  const sel = h("select", {
    "aria-label": "Choose exercise to add",
    "data-focus-key": "add-exercise",
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
            if (!sel.value) return;
            try {
              const rows = await addExerciseSets(sel.value);
              const oldCard = cardsByEx.get(sel.value);
              const freshCard = await buildExerciseCard(sel.value);
              cardsByEx.set(sel.value, freshCard);
              if (oldCard) oldCard.replaceWith(freshCard);
              else root.insertBefore(freshCard, addCard);
              focusControl(rowById.get(rows[0]?.id ?? "") ?? freshCard, "done");
            } catch (err) {
              console.error(err);
              toast("Couldn't add exercise — storage unavailable. Retry.");
            }
          },
        },
        "Add",
      ),
    ),
  );
  root.appendChild(addCard);

  root.appendChild(
    h(
      "div",
      { class: "sticky-actions" },
      h(
        "button",
        {
          class: "primary grow",
          onclick: async () => {
            try {
              await finishWorkout(workout.id);
              toast("Workout saved. Nice work!");
              go("/history");
            } catch (err) {
              console.error(err);
              toast("Couldn't finish workout — storage unavailable. Retry.");
            }
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
            try {
              await discardWorkout(workout.id);
              go("/today");
            } catch (err) {
              console.error(err);
              toast("Couldn't discard workout — storage unavailable. Retry.");
            }
          },
        },
        "Discard",
      ),
    ),
  );

  window.onbeforeunload = (e) => {
    e.preventDefault();
  };

  return root;
}
