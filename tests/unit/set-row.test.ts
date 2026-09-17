// @vitest-environment jsdom
/** Set-row + rest-card DOM vectors: Option A toggle, focus keys, prefill hint,
 *  rest-handle wiring, quiet a11y (spec §7 R1/R2/R3/R4/R5/R6). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderSetRow } from "../../src/components/setRow.ts";
import { renderRestTimer } from "../../src/components/restTimer.ts";
import { restoreTitle } from "../../src/lib/timer.ts";
import type { WorkoutSet } from "../../src/lib/types.ts";

function makeSet(over: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "set-1",
    workoutId: "w-1",
    exerciseId: "ex-bench",
    order: 0,
    weightKg: 60,
    reps: 8,
    completed: false,
    createdAt: 0,
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.title = "Lift Log";
  restoreTitle();
  document.title = "Lift Log";
  document.body.replaceChildren();
});

afterEach(() => {
  restoreTitle();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("set row: Option A Done toggle", () => {
  it("incomplete row shows one Done button, aria-pressed=false, data-completed=false", () => {
    const row = renderSetRow({
      set: makeSet({ completed: false }),
      index: 1,
      units: "lb",
      onChange: () => {},
      onDelete: () => {},
    });
    const doneCell = row.querySelector("td.set-cell-done");
    expect(doneCell).not.toBeNull();
    const buttons = doneCell?.querySelectorAll("button") ?? [];
    expect(buttons.length).toBe(1);
    const done = buttons[0];
    expect(done?.textContent).toBe("Done");
    expect(done?.getAttribute("aria-pressed")).toBe("false");
    expect(done?.getAttribute("aria-label")).toBe("Mark set 1 complete");
    expect(done?.getAttribute("data-focus-key")).toBe("done");
    expect(row.getAttribute("data-completed")).toBe("false");
  });

  it("completed row flips to Undo with aria-pressed=true + data-completed=true", () => {
    const row = renderSetRow({
      set: makeSet({ completed: true }),
      index: 2,
      units: "lb",
      onChange: () => {},
      onDelete: () => {},
    });
    const done = row.querySelector('[data-focus-key="done"]');
    expect(done?.textContent).toBe("Undo");
    expect(done?.getAttribute("aria-pressed")).toBe("true");
    expect(done?.getAttribute("aria-label")).toBe("Reopen set 2");
    expect(row.getAttribute("data-completed")).toBe("true");
  });

  it("Done tap commits the toggle with the row's displayed values", () => {
    let next: WorkoutSet | undefined;
    const row = renderSetRow({
      set: makeSet({ completed: false }),
      index: 1,
      units: "kg",
      onChange: (n) => {
        next = n;
      },
      onDelete: () => {},
    });
    document.body.appendChild(row);
    (row.querySelector('[data-focus-key="done"]') as HTMLElement).click();
    expect(next?.completed).toBe(true);
    expect(next?.weightKg).toBe(60);
    expect(next?.reps).toBe(8);
  });

  it("old affordances are gone: no checkbox, no suggestion-accept button", () => {
    const row = renderSetRow({
      set: makeSet({ weightKg: 20 }),
      index: 1,
      units: "lb",
      suggestionKg: 60,
      onChange: () => {},
      onDelete: () => {},
    });
    expect(row.querySelector('input[type="checkbox"]')).toBeNull();
    const labels = [...row.querySelectorAll("button")].map((b) => b.textContent);
    expect(labels).not.toContain("✓");
    // Only the steppers + Done + delete exist.
    expect([...row.querySelectorAll("button")].length).toBe(6);
  });
});

describe("set row: focus keys + suggestion hint (R1/R3)", () => {
  it("exposes data-focus-key on every interactive control", () => {
    const row = renderSetRow({
      set: makeSet(),
      index: 1,
      units: "lb",
      onChange: () => {},
      onDelete: () => {},
    });
    for (const key of [
      "weight",
      "reps",
      "weight-dec",
      "weight-inc",
      "reps-dec",
      "reps-inc",
      "done",
      "del",
    ]) {
      expect(
        row.querySelector(`[data-focus-key="${key}"]`),
        `missing focus key ${key}`,
      ).not.toBeNull();
    }
  });

  it("shows the ghost suggestion placeholder only for incomplete non-matching rows", () => {
    const hinted = renderSetRow({
      set: makeSet({ completed: false, weightKg: 20 }),
      index: 1,
      units: "lb",
      suggestionKg: 60,
      onChange: () => {},
      onDelete: () => {},
    });
    const input = hinted.querySelector(
      '[data-focus-key="weight"]',
    ) as HTMLInputElement;
    expect(input.placeholder.length).toBeGreaterThan(0);

    const matched = renderSetRow({
      set: makeSet({ completed: false, weightKg: 60 }),
      index: 1,
      units: "lb",
      suggestionKg: 60,
      onChange: () => {},
      onDelete: () => {},
    });
    expect(
      (matched.querySelector('[data-focus-key="weight"]') as HTMLInputElement)
        .placeholder,
    ).toBe("");

    const doneRow = renderSetRow({
      set: makeSet({ completed: true, weightKg: 20 }),
      index: 1,
      units: "lb",
      suggestionKg: 60,
      onChange: () => {},
      onDelete: () => {},
    });
    expect(
      (doneRow.querySelector('[data-focus-key="weight"]') as HTMLInputElement)
        .placeholder,
    ).toBe("");
  });
});

describe("rest card handle (R4/R5/R6)", () => {
  it("starts at the requested duration with countdown label + title, no live chatter", () => {
    const handle = renderRestTimer(90, () => {});
    document.body.appendChild(handle.element);
    handle.start(90);
    expect(handle.element.textContent).toContain("1:30");
    expect(document.title).toContain("Rest");
    // The per-second label is plain text; only the done announcer is live.
    const live = handle.element.querySelectorAll("[aria-live]");
    expect(live.length).toBe(1);
    expect(live[0]?.getAttribute("aria-live")).toBe("polite");
    expect(live[0]?.classList.contains("sr-only")).toBe(true);
    expect(live[0]?.textContent).toBe("");
    handle.stop();
  });

  it("expiry locks a persistent done state + exactly one announcement", () => {
    const handle = renderRestTimer(90, () => {});
    document.body.appendChild(handle.element);
    handle.start(2);
    vi.advanceTimersByTime(2000);
    expect(handle.element.textContent).toContain("Rest done — go!");
    expect(handle.element.classList.contains("rest-done")).toBe(true);
    const announcer = handle.element.querySelector(
      ".sr-only[aria-live=polite]",
    );
    expect(announcer?.textContent).toBe("Rest complete. Next set.");
    // A second completion while running restarts at full duration (R4).
    handle.start(90);
    expect(handle.element.textContent).toContain("1:30");
    handle.stop();
  });

  it("stop() acknowledges the done state and restores the title", () => {
    const handle = renderRestTimer(90, () => {});
    document.body.appendChild(handle.element);
    handle.start(1);
    vi.advanceTimersByTime(1000);
    expect(handle.element.textContent).toContain("Rest done — go!");
    handle.stop();
    expect(handle.element.textContent).toContain("Rest: idle");
    expect(document.title).toBe("Lift Log");
  });
});
