/** Shared modal bottom-sheet choreography for <dialog class="sheet">:
 *  one sheet at a time, backdrop tap closes, removed from the DOM on close.
 *  Callers own the content, Esc/Cancel behavior, and showModal() timing. */
import { h } from "../lib/ui.ts";

/**
 * Mount a sheet dialog and open it modally. Returns false when another sheet
 * is already open (caller should abort, e.g. resolve its promise with null).
 */
export function mountSheet(dialog: HTMLDialogElement): boolean {
  if (document.querySelector("dialog.sheet")) return false;
  // Click on the backdrop (the dialog itself, since content fills it) closes.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove());
  document.body.appendChild(dialog);
  dialog.showModal();
  return true;
}

/** Create an empty sheet dialog with a drag-handle affordance. */
export function sheetDialog(label: string): HTMLDialogElement {
  return h(
    "dialog",
    { class: "sheet", "aria-label": label },
    h("div", { class: "sheet-handle", "aria-hidden": "true" }),
  ) as HTMLDialogElement;
}
