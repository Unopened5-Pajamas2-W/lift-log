/** Substitute-picker bottom sheet: ranked candidate rows (name, equipment,
 *  recovery %, suggested weight). Resolves the chosen exercise id, or null on
 *  Cancel/backdrop/Esc. Presentation-only — ranking and suggestions are the
 *  caller's job. */
import { mountSheet, sheetDialog } from "./sheet.ts";
import type { Exercise, Units } from "../lib/types.ts";
import { formatWeight } from "../lib/units.ts";
import { h } from "../lib/ui.ts";

export interface SubstituteRow {
  exercise: Exercise;
  /** Suggested working weight in kg (undefined when no history exists). */
  suggestedKg?: number;
  recoveryPct: number;
}

export interface SubstituteSheetOpts {
  outgoingName: string;
  rows: SubstituteRow[];
  units: Units;
}

/** Open the picker; resolves with the selected exercise id or null. */
export function openSubstituteSheet(
  opts: SubstituteSheetOpts,
): Promise<string | null> {
  return new Promise((resolve) => {
    const dialog = sheetDialog(`Choose a substitute for ${opts.outgoingName}`);
    let chosen: string | null = null;
    dialog.append(h("strong", {}, `Swap ${opts.outgoingName} for…`));
    if (opts.rows.length === 0) {
      dialog.append(
        h(
          "p",
          { class: "muted" },
          "No eligible substitutes — check Settings → Equipment or finish this set.",
        ),
      );
    } else {
      const list = h("div", { class: "sheet-list" });
      opts.rows.forEach((r, i) => {
        const meta = [
          r.exercise.equipment,
          `${r.recoveryPct}% recovered`,
          ...(r.suggestedKg != null
            ? [
                `suggested ${formatWeight(r.suggestedKg, opts.units)} ${opts.units}`,
              ]
            : []),
        ];
        list.appendChild(
          h(
            "button",
            {
              class: "sheet-row",
              ...(i === 0 ? { autofocus: true } : {}),
              "aria-label": `${r.exercise.name}: ${meta.join(", ")}`,
              onclick: () => {
                chosen = r.exercise.id;
                dialog.close();
              },
            },
            h(
              "span",
              { class: "grow" },
              h("strong", {}, r.exercise.name),
              h("span", { class: "muted sheet-row-meta" }, meta.join(" · ")),
            ),
          ),
        );
      });
      dialog.append(list);
    }
    dialog.append(
      h(
        "div",
        { class: "row" },
        h(
          "button",
          {
            class: "primary grow",
            ...(opts.rows.length === 0 ? { autofocus: true } : {}),
            onclick: () => dialog.close(),
          },
          "Cancel",
        ),
      ),
    );
    // Single source of truth: every close path (row pick, Cancel, backdrop,
    // Esc) funnels through the close event exactly once.
    dialog.addEventListener("close", () => resolve(chosen));
    if (!mountSheet(dialog)) resolve(null);
  });
}
