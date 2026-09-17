/** Per-set editor row: weight/reps steppers, RPE, done checkbox, delete. */
import type { Units, WorkoutSet } from "../lib/types.ts";
import { displayWeight, toKg } from "../lib/units.ts";
import { h, toast } from "../lib/ui.ts";

export interface SetRowOpts {
  set: WorkoutSet;
  index: number; // 1-based within exercise
  units: Units;
  suggestionKg?: number; // ghost suggestion, one-tap accept
  onChange: (next: WorkoutSet) => void;
  onDelete: () => void;
}

export function renderSetRow(opts: SetRowOpts): HTMLElement {
  const { set, index, units } = opts;
  const step = units === "lb" ? 2.5 : 1.25;
  const row = h("tr", {});
  const num = h("td", {}, String(index));

  const weightInput = h("input", {
    type: "number",
    min: "0",
    step: String(step),
    value: String(displayWeight(set.weightKg, units)),
    "aria-label": `Weight for set ${index} in ${units}`,
  }) as HTMLInputElement;
  if (
    opts.suggestionKg != null &&
    !set.completed &&
    set.weightKg !== opts.suggestionKg
  ) {
    weightInput.placeholder = `${displayWeight(opts.suggestionKg, units)}`;
    weightInput.title = `Suggested: ${displayWeight(opts.suggestionKg, units)} ${units} — tap ✓ to accept`;
  }
  weightInput.addEventListener("change", () => {
    const v = Number(weightInput.value);
    if (Number.isFinite(v) && v >= 0)
      opts.onChange({ ...set, weightKg: Math.round(toKg(v, units) * 4) / 4 });
    else weightInput.value = String(displayWeight(set.weightKg, units));
  });

  const repsInput = h("input", {
    type: "number",
    min: "0",
    max: "100",
    step: "1",
    value: String(set.reps),
    "aria-label": `Reps for set ${index}`,
  }) as HTMLInputElement;
  repsInput.addEventListener("change", () => {
    const v = Math.floor(Number(repsInput.value));
    if (Number.isFinite(v) && v >= 0 && v <= 100)
      opts.onChange({ ...set, reps: v });
    else repsInput.value = String(set.reps);
  });

  const wCell = h(
    "td",
    {},
    h(
      "span",
      { class: "stepper" },
      h(
        "button",
        {
          "aria-label": `Decrease weight for set ${index}`,
          onclick: () =>
            opts.onChange({
              ...set,
              weightKg: Math.max(
                0,
                Math.round((set.weightKg - toKg(step, units)) * 4) / 4,
              ),
            }),
        },
        "−",
      ),
      weightInput,
      h(
        "button",
        {
          "aria-label": `Increase weight for set ${index}`,
          onclick: () =>
            opts.onChange({
              ...set,
              weightKg: Math.round((set.weightKg + toKg(step, units)) * 4) / 4,
            }),
        },
        "+",
      ),
    ),
  );
  const rCell = h(
    "td",
    {},
    h(
      "span",
      { class: "stepper" },
      h(
        "button",
        {
          "aria-label": `Fewer reps for set ${index}`,
          onclick: () =>
            opts.onChange({ ...set, reps: Math.max(0, set.reps - 1) }),
        },
        "−",
      ),
      repsInput,
      h(
        "button",
        {
          "aria-label": `More reps for set ${index}`,
          onclick: () =>
            opts.onChange({ ...set, reps: Math.min(100, set.reps + 1) }),
        },
        "+",
      ),
    ),
  );
  const done = h("input", {
    type: "checkbox",
    checked: set.completed ? true : undefined,
    "aria-label": `Mark set ${index} complete`,
  }) as HTMLInputElement;
  done.addEventListener("change", () =>
    opts.onChange({ ...set, completed: done.checked }),
  );
  const accept =
    opts.suggestionKg != null && !set.completed
      ? h(
          "button",
          {
            "aria-label": `Accept suggested weight for set ${index}`,
            title: "Accept suggestion",
            onclick: () => {
              opts.onChange({ ...set, weightKg: opts.suggestionKg as number });
              toast("Suggestion applied");
            },
          },
          "✓",
        )
      : null;
  const del = h(
    "button",
    {
      "aria-label": `Delete set ${index}`,
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
    h("td", {}, done),
    h("td", {}, accept ?? "", del),
  );
  return row;
}
