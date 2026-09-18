// @vitest-environment jsdom
/** Exercise info: shared detail body (Moves page + sheet) and the workout
 *  bottom-sheet dialog (open → focus Close → remove on close). */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  exerciseInfoContent,
  openExerciseInfo,
} from "../../src/components/exerciseInfo.ts";
import type { Exercise } from "../../src/lib/types.ts";

// jsdom has no <dialog> implementation; the polyfill mirrors what the native
// methods do (toggle open attribute, fire the close event). Production Safari
// uses the native methods untouched.
if (!("showModal" in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
    close(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
}

function makeExercise(over: Partial<Exercise> = {}): Exercise {
  return {
    id: "bench-press",
    name: "Barbell Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Grip slightly wider than shoulder width.",
      "Lower the bar to your mid-chest.",
      "Press until arms lock out.",
    ],
    tips: "Keep your feet planted.",
    isCustom: false,
    isArchived: false,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("exerciseInfoContent (shared body)", () => {
  it("renders name, meta line, numbered instructions, tips, and safety line", () => {
    const el = exerciseInfoContent(makeExercise());
    expect(el.querySelector("strong")?.textContent).toBe("Barbell Bench Press");
    expect(el.textContent).toContain("Chest · barbell · intermediate");
    expect(el.querySelectorAll("ol li").length).toBe(3);
    expect(el.textContent).toContain("Keep your feet planted.");
    expect(el.textContent).toContain("Stop if you feel sharp pain.");
  });

  it("omits the tips paragraph when absent and marks custom exercises", () => {
    const el = exerciseInfoContent(makeExercise({ tips: undefined, isCustom: true }));
    expect(el.textContent).not.toContain("Keep your feet planted.");
    expect(el.textContent).toContain("custom");
  });
});

describe("openExerciseInfo (workout bottom sheet)", () => {
  it("opens one modal dialog with the instructions and a Close button", () => {
    openExerciseInfo(makeExercise());
    const dialog = document.querySelector("dialog.sheet");
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-label")).toBe(
      "Barbell Bench Press instructions",
    );
    expect(dialog?.querySelectorAll("ol li").length).toBe(3);
    expect(dialog?.textContent).toContain("Close");
    openExerciseInfo(makeExercise());
    expect(document.querySelectorAll("dialog.sheet").length).toBe(1);
  });

  it("Close removes the dialog from the DOM", () => {
    openExerciseInfo(makeExercise());
    const dialog = document.querySelector("dialog.sheet") as HTMLDialogElement;
    (dialog.querySelector("button.primary") as HTMLElement).click();
    expect(document.querySelector("dialog.sheet")).toBeNull();
  });

  it("renders even for exercises without tips or instructions lines", () => {
    openExerciseInfo(
      makeExercise({ instructions: [], tips: undefined }),
    );
    const dialog = document.querySelector("dialog.sheet");
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelectorAll("ol li").length).toBe(0);
    expect(dialog?.textContent).toContain("Stop if you feel sharp pain.");
  });
});
