/** Muscle-split card (spec R7): completed working-set volume by primary
 *  muscle over a selectable window, as share bars in the recovery-list idiom. */
import { segmented } from "./segmented.ts";
import type { RangeKey } from "../lib/analytics.ts";
import { muscleSplit, windowCutoff } from "../lib/analytics.ts";
import { MUSCLE_LABELS } from "../data/muscles.ts";
import type { Exercise, Units, WorkoutSet } from "../lib/types.ts";
import { fmtVolume, h } from "../lib/ui.ts";

const WINDOWS: readonly { value: RangeKey; label: string }[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "All", label: "All" },
];

/** One muscle row: label + formatted volume, bar width ∝ share. */
function splitRow(
  muscle: string,
  volumeKg: number,
  share: number,
  units: Units,
): HTMLElement {
  return h(
    "li",
    { class: "rec-row" },
    h(
      "div",
      { class: "rec-row-top" },
      h("span", {}, muscle),
      h(
        "span",
        { class: "pr-meta" },
        `${fmtVolume(volumeKg, units)} · ${Math.round(share * 100)}%`,
      ),
    ),
    h("div", { class: "bar" }, h("i", { style: `width:${Math.max(2, share * 100)}%` })),
  );
}

/** Render the muscle-split card; `allSets`/`exercisesById` stay owned by the
 *  caller so the window control re-derives without re-querying IndexedDB. */
export function renderMuscleSplitCard(
  allSets: WorkoutSet[],
  exercisesById: Map<string, Exercise>,
  units: Units,
): HTMLElement {
  const card = h("div", { class: "card" }, h("strong", {}, "Muscle split"));
  const listHolder = h("div", {});
  let range: RangeKey = "90d";

  const paint = (): void => {
    const cutoff = windowCutoff(range, Date.now());
    const rows = muscleSplit(allSets, exercisesById, cutoff);
    const ul = h("ul", { class: "recovery-list split-list" });
    if (rows.length === 0)
      ul.appendChild(
        h("li", { class: "muted" }, "No completed sets in this window."),
      );
    for (const r of rows)
      ul.appendChild(
        splitRow(MUSCLE_LABELS[r.muscle], r.volumeKg, r.share, units),
      );
    listHolder.replaceChildren(ul);
  };

  card.appendChild(
    segmented("Muscle split window", WINDOWS, range, (value) => {
      range = value as RangeKey;
      paint();
    }),
  );
  card.appendChild(listHolder);
  paint();
  return card;
}
