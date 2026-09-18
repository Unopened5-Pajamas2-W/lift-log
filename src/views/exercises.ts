/** Exercise library: search/filter, detail, create/edit/archive. */
import {
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  ALL_EQUIPMENT,
} from "../data/muscles.ts";
import { exerciseInfoContent } from "../components/exerciseInfo.ts";
import {
  archiveExercise,
  getExercise,
  listExercises,
  saveExercise,
  uuid,
} from "../lib/store.ts";
import type {
  Difficulty,
  Equipment,
  Exercise,
  MuscleGroup,
} from "../lib/types.ts";
import { go, h, toast } from "../lib/ui.ts";

function exerciseForm(existing?: Exercise, onSaved?: () => void): HTMLElement {
  const now = Date.now();
  const name = h("input", {
    type: "text",
    value: existing?.name ?? "",
    "aria-label": "Exercise name",
    required: "true",
  }) as HTMLInputElement;
  const muscle = h("select", {
    "aria-label": "Primary muscle",
  }) as HTMLSelectElement;
  for (const m of MUSCLE_GROUPS) {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = MUSCLE_LABELS[m];
    if (existing?.primaryMuscle === m) o.selected = true;
    muscle.appendChild(o);
  }
  const equip = h("select", { "aria-label": "Equipment" }) as HTMLSelectElement;
  for (const e of ALL_EQUIPMENT) {
    const o = document.createElement("option");
    o.value = e;
    o.textContent = e;
    if (existing?.equipment === e) o.selected = true;
    equip.appendChild(o);
  }
  const diff = h("select", { "aria-label": "Difficulty" }) as HTMLSelectElement;
  for (const d of ["beginner", "intermediate", "advanced"] as Difficulty[]) {
    const o = document.createElement("option");
    o.value = d;
    o.textContent = d;
    if (existing?.difficulty === d) o.selected = true;
    diff.appendChild(o);
  }
  const instr = h("textarea", {
    "aria-label": "Instructions, one per line",
    rows: "4",
  }) as HTMLTextAreaElement;
  instr.value = existing?.instructions.join("\n") ?? "";
  const form = h(
    "form",
    { class: "card" },
    h("strong", {}, existing ? "Edit exercise" : "New exercise"),
    h("label", {}, "Name", name),
    h(
      "div",
      { class: "row" },
      h("label", { class: "grow" }, "Muscle", muscle),
      h("label", { class: "grow" }, "Equipment", equip),
    ),
    h("label", {}, "Difficulty", diff),
    h("label", {}, "Instructions (one per line)", instr),
    h(
      "div",
      { class: "row" },
      h("button", { class: "primary", type: "submit" }, "Save"),
      h("button", { type: "button", onclick: () => onSaved?.() }, "Cancel"),
    ),
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!name.value.trim()) {
      toast("Name is required");
      return;
    }
    const ex: Exercise = {
      id: existing?.id ?? `custom-${uuid()}`,
      name: name.value.trim(),
      primaryMuscle: muscle.value as MuscleGroup,
      secondaryMuscles: existing?.secondaryMuscles ?? [],
      equipment: equip.value as Equipment,
      difficulty: diff.value as Difficulty,
      instructions: instr.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      tips: existing?.tips,
      isCustom: true,
      isArchived: existing?.isArchived ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await saveExercise(ex);
    toast("Exercise saved");
    onSaved?.();
  });
  return form;
}

export async function renderExercises(
  detailId?: string,
  returnTo?: string,
): Promise<HTMLElement> {
  const root = h("div", {});
  if (detailId) {
    const ex = await getExercise(detailId);
    if (!ex) return h("div", { class: "card" }, "Exercise not found.");
    const editing = h("div", {});
    const view = h(
      "div",
      { class: "card" },
      exerciseInfoContent(ex),
      h(
        "div",
        { class: "row" },
        h("button", { onclick: () => go(returnTo ?? "/exercises") }, "Back"),
        h(
          "button",
          {
            onclick: () =>
              go(
                `/progress/exercise/${encodeURIComponent(ex.id)}?from=${encodeURIComponent(`/exercises/${ex.id}`)}`,
              ),
          },
          "View progress",
        ),
        h(
          "button",
          {
            onclick: () => {
              editing.replaceChildren(
                exerciseForm(ex, () => go(`/exercises/${ex.id}`)),
              );
            },
          },
          "Edit",
        ),
        h(
          "button",
          {
            onclick: async () => {
              if (
                !window.confirm(
                  ex.isArchived
                    ? "Unarchive this exercise?"
                    : "Archive this exercise?",
                )
              )
                return;
              await archiveExercise(ex.id, !ex.isArchived);
              go("/exercises");
            },
          },
          ex.isArchived ? "Unarchive" : "Archive",
        ),
      ),
    );
    root.append(view, editing);
    return root;
  }

  const q = h("input", {
    type: "search",
    placeholder: "Search exercises…",
    "aria-label": "Search exercises",
  }) as HTMLInputElement;
  const muscleF = h("select", {
    "aria-label": "Filter by muscle",
  }) as HTMLSelectElement;
  const equipF = h("select", {
    "aria-label": "Filter by equipment",
  }) as HTMLSelectElement;
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "All muscles";
  muscleF.appendChild(all);
  for (const m of MUSCLE_GROUPS) {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = MUSCLE_LABELS[m];
    muscleF.appendChild(o);
  }
  const allE = document.createElement("option");
  allE.value = "";
  allE.textContent = "All equipment";
  equipF.appendChild(allE);
  for (const e of ALL_EQUIPMENT) {
    const o = document.createElement("option");
    o.value = e;
    o.textContent = e;
    equipF.appendChild(o);
  }
  const list = h("div", {});
  const creator = h("div", {});
  async function draw(): Promise<void> {
    const needle = q.value.trim().toLowerCase();
    const allEx = await listExercises(false);
    const shown = allEx.filter(
      (e) =>
        (!needle || e.name.toLowerCase().includes(needle)) &&
        (!muscleF.value ||
          e.primaryMuscle === muscleF.value ||
          e.secondaryMuscles.includes(muscleF.value as MuscleGroup)) &&
        (!equipF.value || e.equipment === equipF.value),
    );
    list.replaceChildren();
    list.appendChild(
      h(
        "p",
        { class: "muted" },
        `${shown.length} exercises (offline built-in library)`,
      ),
    );
    for (const e of shown.slice(0, 200)) {
      list.appendChild(
        h(
          "div",
          { class: "card row" },
          h(
            "span",
            { class: "grow" },
            h("strong", {}, e.name),
            h(
              "div",
              { class: "muted" },
              `${MUSCLE_LABELS[e.primaryMuscle]} · ${e.equipment}`,
            ),
          ),
          h(
            "button",
            {
              "aria-label": `Open ${e.name}`,
              onclick: () => go(`/exercises/${e.id}`),
            },
            "Open",
          ),
        ),
      );
    }
  }
  q.addEventListener("input", () => void draw());
  muscleF.addEventListener("change", () => void draw());
  equipF.addEventListener("change", () => void draw());
  root.append(
    h(
      "div",
      { class: "card" },
      h("div", { class: "row" }, q),
      h("div", { class: "row" }, muscleF, equipF),
      h(
        "div",
        { class: "row" },
        h(
          "button",
          {
            onclick: () =>
              creator.replaceChildren(
                exerciseForm(undefined, () => {
                  creator.replaceChildren();
                  void draw();
                }),
              ),
          },
          "+ New exercise",
        ),
      ),
    ),
    creator,
    list,
  );
  await draw();
  return root;
}
