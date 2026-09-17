/** Per-set editor row: weight/reps steppers, big Done/Undo toggle, delete.
 *  Steppers build `next` from the CURRENT input values (not the `set` prop), so
 *  a typed-but-not-yet-committed value is never clobbered by a stepper tap. */
import type { Units, WorkoutSet } from "../lib/types.ts";
import { displayWeight, toKg } from "../lib/units.ts";
import { h } from "../lib/ui.ts";

export interface SetRowOpts {
  set: WorkoutSet;
  index: number; // 1-based within exercise
  units: Units;
  suggestionKg?: number; // ghost suggestion hint (prefill happens at creation)
  onChange: (next: WorkoutSet) => void;
  onDelete: () => void;
}

export function renderSetRow(opts: SetRowOpts): HTMLElement {
  const { set, index, units } = opts;
  const isWarmup = set.isWarmup === true;
  const step = units === "lb" ? 2.5 : 1.25;
  const label = isWarmup ? `warmup set ${index}` : `set ${index}`;
  const row = h(
    "tr",
    {
      class: "set-row",
      "data-completed": set.completed ? "true" : "false",
      ...(isWarmup ? { "data-warmup": "true" } : {}),
    },
  );
  const num = h(
    "td",
    { class: "set-cell-num" },
    isWarmup ? h("span", { class: "wu-badge" }, "WU") : "",
    String(index),
  );

  const weightInput = h("input", {
    type: "number",
    inputmode: "decimal",
    min: "0",
    step: String(step),
    value: String(displayWeight(set.weightKg, units)),
    "aria-label": `Weight for ${label} in ${units}`,
    "data-focus-key": "weight",
  }) as HTMLInputElement;
  if (
    opts.suggestionKg != null &&
    !set.completed &&
    set.weightKg !== opts.suggestionKg
  ) {
    weightInput.placeholder = `${displayWeight(opts.suggestionKg, units)}`;
    weightInput.title = `Suggested: ${displayWeight(opts.suggestionKg, units)} ${units} — new sets are prefilled with it`;
  }

  const repsInput = h("input", {
    type: "number",
    inputmode: "numeric",
    min: "0",
    max: "100",
    step: "1",
    value: String(set.reps),
    "aria-label": `Reps for ${label}`,
    "data-focus-key": "reps",
  }) as HTMLInputElement;

  /** Current displayed weight (falls back to last committed when invalid). */
  function readWeightKg(): number {
    const v = Number(weightInput.value);
    return Number.isFinite(v) && v >= 0 ? toKg(v, units) : set.weightKg;
  }
  /** Current displayed reps (falls back to last committed when invalid). */
  function readReps(): number {
    const v = Math.floor(Number(repsInput.value));
    return Number.isFinite(v) && v >= 0 && v <= 100 ? v : set.reps;
  }
  /** Snapshot of what the row currently shows (commits match the display). */
  function readRow(): WorkoutSet {
    return { ...set, weightKg: readWeightKg(), reps: readReps() };
  }

  weightInput.addEventListener("change", () => {
    const v = Number(weightInput.value);
    if (Number.isFinite(v) && v >= 0)
      opts.onChange({
        ...readRow(),
        weightKg: Math.round(toKg(v, units) * 4) / 4,
      });
    else weightInput.value = String(displayWeight(set.weightKg, units));
  });
  repsInput.addEventListener("change", () => {
    const v = Math.floor(Number(repsInput.value));
    if (Number.isFinite(v) && v >= 0 && v <= 100)
      opts.onChange({ ...readRow(), reps: v });
    else repsInput.value = String(set.reps);
  });

  const wCell = h(
    "td",
    { class: "set-cell-weight" },
    h("span", { class: "field-label", "aria-hidden": "true" }, `Wt (${units})`),
    h(
      "span",
      { class: "stepper" },
      h(
        "button",
        {
          "aria-label": `Decrease weight for ${label}`,
          "data-focus-key": "weight-dec",
          onclick: () => {
            const weightKg = Math.max(
              0,
              Math.round((readWeightKg() - toKg(step, units)) * 4) / 4,
            );
            weightInput.value = String(displayWeight(weightKg, units));
            opts.onChange({ ...readRow(), weightKg });
          },
        },
        "−",
      ),
      weightInput,
      h(
        "button",
        {
          "aria-label": `Increase weight for ${label}`,
          "data-focus-key": "weight-inc",
          onclick: () => {
            const weightKg =
              Math.round((readWeightKg() + toKg(step, units)) * 4) / 4;
            weightInput.value = String(displayWeight(weightKg, units));
            opts.onChange({ ...readRow(), weightKg });
          },
        },
        "+",
      ),
    ),
  );
  const rCell = h(
    "td",
    { class: "set-cell-reps" },
    h("span", { class: "field-label", "aria-hidden": "true" }, "Reps"),
    h(
      "span",
      { class: "stepper" },
      h(
        "button",
        {
          "aria-label": `Fewer reps for ${label}`,
          "data-focus-key": "reps-dec",
          onclick: () => {
            const reps = Math.max(0, readReps() - 1);
            repsInput.value = String(reps);
            opts.onChange({ ...readRow(), reps });
          },
        },
        "−",
      ),
      repsInput,
      h(
        "button",
        {
          "aria-label": `More reps for ${label}`,
          "data-focus-key": "reps-inc",
          onclick: () => {
            const reps = Math.min(100, readReps() + 1);
            repsInput.value = String(reps);
            opts.onChange({ ...readRow(), reps });
          },
        },
        "+",
      ),
    ),
  );

  const doneToggle = h(
    "button",
    {
      class: "done-toggle",
      "aria-pressed": String(set.completed),
      "aria-label": set.completed
        ? `Reopen ${label}`
        : `Mark ${label} complete`,
      "data-focus-key": "done",
      onclick: () => opts.onChange({ ...readRow(), completed: !set.completed }),
    },
    set.completed ? "Undo" : "Done",
  );
  const del = h(
    "button",
    {
      "aria-label": `Delete ${label}`,
      "data-focus-key": "del",
      onclick: () => {
        if (window.confirm("Delete this set?")) opts.onDelete();
      },
    },
    "×",
  );
  row.append(
    num,
    wCell,
    rCell,
    h("td", { class: "set-cell-done" }, doneToggle),
    h("td", { class: "set-cell-actions" }, del),
  );
  return row;
}
