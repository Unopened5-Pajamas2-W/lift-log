/** Exercise instruction views: shared read-only detail body (exercises page,
 *  history return-path) and an in-place bottom-sheet dialog (workout page —
 *  navigating away would unmount the view and kill a running rest timer). */
import type { Exercise } from "../lib/types.ts";
import { MUSCLE_LABELS } from "../data/muscles.ts";
import { mountSheet } from "./sheet.ts";
import { h } from "../lib/ui.ts";

/** Read-only instruction card body shared by the Moves detail page and the
 *  info sheet. No interactive controls. */
export function exerciseInfoContent(ex: Exercise): HTMLElement {
  return h(
    "div",
    {},
    h("strong", {}, ex.name),
    h(
      "p",
      { class: "muted" },
      `${MUSCLE_LABELS[ex.primaryMuscle]} · ${ex.equipment} · ${ex.difficulty}${ex.isCustom ? " · custom" : ""}`,
    ),
    h("ol", {}, ...ex.instructions.map((s) => h("li", {}, s))),
    ex.tips ? h("p", {}, ex.tips) : "",
    h(
      "p",
      { class: "muted" },
      "Stop if you feel sharp pain. Not medical advice.",
    ),
  );
}

/** Open the exercise's instructions as a modal bottom sheet over the current
 *  view. Focus trap + Esc come from <dialog>; the dialog removes itself on
 *  close so no listeners outlive it. */
export function openExerciseInfo(ex: Exercise): void {
  const close = h(
    "button",
    { class: "primary grow", autofocus: true },
    "Close",
  );
  const dialog = h(
    "dialog",
    { class: "sheet", "aria-label": `${ex.name} instructions` },
    exerciseInfoContent(ex),
    h("div", { class: "row" }, close),
  );
  close.addEventListener("click", () => dialog.close());
  mountSheet(dialog);
}
