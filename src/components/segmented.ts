/** Segmented control: row of mutually exclusive toggle buttons
 *  (aria-pressed) for small option sets like time ranges. */
import { h } from "../lib/ui.ts";

export interface SegmentedOption {
  value: string;
  label: string;
}

/** Render a labelled group of pressed-state buttons. State is held in the
 *  DOM; `onChange` fires with the newly selected value. */
export function segmented(
  label: string,
  options: readonly SegmentedOption[],
  current: string,
  onChange: (value: string) => void,
): HTMLElement {
  const group = h(
    "div",
    { class: "segmented", role: "group", "aria-label": label },
  );
  for (const opt of options) {
    group.appendChild(
      h(
        "button",
        {
          type: "button",
          "aria-pressed": String(opt.value === current),
          "aria-label": `${opt.label} (${label})`,
          onclick: (e) => {
            const target = e.currentTarget;
            for (const b of group.querySelectorAll("button"))
              b.setAttribute("aria-pressed", String(b === target));
            onChange(opt.value);
          },
        },
        opt.label,
      ),
    );
  }
  return group;
}
