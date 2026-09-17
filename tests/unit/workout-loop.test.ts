// @vitest-environment jsdom
/** Workout-loop integration vectors: in-place patching + focus (R1), suggestion
 *  prefill chain (R3), rest auto-start wiring (R4), honest failure rollback (R9).
 *  Real store on fake-indexeddb + real timers (IDB does not advance on fake
 *  clocks); fast component-contract tests stay in set-row.test.ts. Spec §7. */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWorkout } from "../../src/views/workout.ts";
import * as store from "../../src/lib/store.ts";
import {
  __resetDbConnection,
  ensureSeeded,
  getSets,
  listExercises,
  saveSettings,
  startWorkout,
  upsertSet,
} from "../../src/lib/store.ts";
import * as timerLib from "../../src/lib/timer.ts";
import { restoreTitle } from "../../src/lib/timer.ts";
import { suggestNextWeight } from "../../src/lib/suggest.ts";
import { displayWeight } from "../../src/lib/units.ts";
import { DB_NAME } from "../../src/lib/types.ts";
import type { Exercise } from "../../src/lib/types.ts";

async function resetDb(): Promise<void> {
  __resetDbConnection();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("delete failed"));
    req.onblocked = () => reject(new Error("delete blocked"));
  });
  __resetDbConnection();
}

let savedConfirm: typeof window.confirm | undefined;

function doneButton(row: Element): HTMLElement {
  const btn = row.querySelector('[data-focus-key="done"]');
  if (!(btn instanceof HTMLElement)) throw new Error("done button missing");
  return btn;
}

function weightInput(row: Element): HTMLInputElement {
  const input = row.querySelector('[data-focus-key="weight"]');
  if (!(input instanceof HTMLInputElement)) throw new Error("weight missing");
  return input;
}

function counterText(root: Element): string | null {
  return root.querySelector("header.topbar span.muted")?.textContent ?? null;
}

function exerciseCard(root: Element, name: string): HTMLElement {
  const cards = [...root.querySelectorAll("div.card")];
  const card = cards.find((c) => c.querySelector("strong")?.textContent === name);
  if (!(card instanceof HTMLElement)) throw new Error(`card missing: ${name}`);
  return card;
}

async function seedExercise(): Promise<Exercise> {
  await ensureSeeded();
  const list = await listExercises();
  const ex = list[0];
  if (!ex) throw new Error("no seeded exercises");
  return ex;
}

beforeEach(async () => {
  await resetDb();
  document.body.replaceChildren();
  document.title = "Lift Log";
  restoreTitle();
  document.title = "Lift Log";
  window.onbeforeunload = null;
  savedConfirm = window.confirm;
  window.confirm = () => true;
  const toastRoot = document.createElement("div");
  toastRoot.id = "toast-root";
  document.body.appendChild(toastRoot);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  restoreTitle();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  window.onbeforeunload = null;
  if (savedConfirm) window.confirm = savedConfirm;
});

describe("R1: in-place set mutations", () => {
  it("Done toggle patches the row in place: counter updates, scroll/hash stable, focus kept", async () => {
    const ex = await seedExercise();
    await saveSettings({ units: "lb", restSeconds: 120 });
    const w = await startWorkout({
      title: "T",
      items: [
        { exerciseId: ex.id, sets: [{ weightKg: 20, reps: 8 }, { weightKg: 20, reps: 8 }] },
      ],
    });
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const hashBefore = location.hash;
    const scrollBefore = window.scrollY;
    const restBefore = root.querySelector(".rest-sticky");
    expect(restBefore).not.toBeNull();
    expect(counterText(root)).toBe("0/2 sets");

    const firstRow = root.querySelector("tbody tr.set-row");
    if (!(firstRow instanceof HTMLElement)) throw new Error("row missing");
    const done = doneButton(firstRow);
    done.focus();
    done.click();

    await vi.waitFor(() => {
      expect(counterText(root)).toBe("1/2 sets");
    });
    // patchRow() replaces the node: re-query, the held reference is detached.
    const patched = root.querySelectorAll("tbody tr.set-row")[0];
    expect(patched?.getAttribute("data-completed")).toBe("true");
    expect(root.querySelector(".rest-sticky")).toBe(restBefore); // no full re-render
    expect(location.hash).toBe(hashBefore); // no navigation
    expect(window.scrollY).toBe(scrollBefore);
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("done");
    expect(patched?.querySelector('[data-focus-key="done"]')?.textContent).toBe(
      "Undo",
    );
    const stored = (await getSets(w.id)).find((s) => s.order === 0);
    expect(stored?.completed).toBe(true);
  });

  it("delete focuses the card Add-set button", async () => {
    const ex = await seedExercise();
    await saveSettings({ units: "lb", restSeconds: 120 });
    const w = await startWorkout({
      title: "T",
      items: [{ exerciseId: ex.id, sets: [{ weightKg: 20, reps: 8 }, { weightKg: 20, reps: 8 }] }],
    });
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    await vi.waitFor(() => {
      expect(root.querySelectorAll("tbody tr.set-row").length).toBe(2);
    });
    const rows = root.querySelectorAll("tbody tr.set-row");
    const del = rows[0]?.querySelector('[data-focus-key="del"]');
    if (!(del instanceof HTMLElement)) throw new Error("delete missing");
    del.click();
    await vi.waitFor(() => {
      expect(root.querySelectorAll("tbody tr.set-row").length).toBe(1);
    });
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("add-set");
    expect(counterText(root)).toBe("0/1 sets");
  });
});

describe("R3: suggestion prefill chain (sugg ?? last ?? 20)", () => {
  it("prefills from the suggestion when history exists", async () => {
    const ex = await seedExercise();
    await saveSettings({ units: "lb", restSeconds: 120 });
    const at = Date.now();
    await upsertSet({
      id: "history-1",
      workoutId: "history-w",
      exerciseId: ex.id,
      order: 0,
      weightKg: 60,
      reps: 8,
      completed: true,
      createdAt: at,
    });
    // Same session-shaped input the view passes (fresh timestamp → no staleness guard).
    const expectedKg = suggestNextWeight(
      [
        {
          weightKg: 60,
          reps: 8,
          completed: true,
          workoutId: "history-w",
          createdAt: at,
        },
      ],
      ex.primaryMuscle,
      "lb",
    ).weightKg;
    const w = await startWorkout({
      title: "T",
      items: [{ exerciseId: ex.id, sets: [{ weightKg: 20, reps: 8 }] }],
    });
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const card = exerciseCard(root, ex.name);
    const add = card.querySelector('button[aria-label^="Add set to"]');
    if (!(add instanceof HTMLElement)) throw new Error("add-set missing");
    add.click();
    await vi.waitFor(() => {
      expect(card.querySelectorAll("tbody tr.set-row").length).toBe(2);
    });
    const newRow = card.querySelectorAll("tbody tr.set-row")[1];
    if (!newRow) throw new Error("new row missing");
    expect(weightInput(newRow).value).toBe(String(displayWeight(expectedKg, "lb")));
  });

  it("falls back to the last set weight when no suggestion exists", async () => {
    const ex = await seedExercise();
    await saveSettings({ units: "lb", restSeconds: 120 });
    const w = await startWorkout({
      title: "T",
      items: [{ exerciseId: ex.id, sets: [{ weightKg: 40, reps: 8 }] }],
    });
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const card = exerciseCard(root, ex.name);
    const add = card.querySelector('button[aria-label^="Add set to"]');
    if (!(add instanceof HTMLElement)) throw new Error("add-set missing");
    add.click();
    await vi.waitFor(() => {
      expect(card.querySelectorAll("tbody tr.set-row").length).toBe(2);
    });
    const newRow = card.querySelectorAll("tbody tr.set-row")[1];
    if (!newRow) throw new Error("new row missing");
    expect(weightInput(newRow).value).toBe(String(displayWeight(40, "lb")));
  });

  it("falls back to 20 kg / 8 reps for a fresh exercise", async () => {
    await ensureSeeded();
    const list = await listExercises();
    const first = list[0];
    const fresh = list.find((e) => e.id !== first?.id);
    if (!first || !fresh) throw new Error("need two seeded exercises");
    await saveSettings({ units: "lb", restSeconds: 120 });
    const w = await startWorkout({
      title: "T",
      items: [{ exerciseId: first.id, sets: [{ weightKg: 40, reps: 8 }] }],
    });
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const sel = root.querySelector("select[data-focus-key=add-exercise]");
    if (!(sel instanceof HTMLSelectElement)) throw new Error("select missing");
    sel.value = fresh.id;
    const addBtn = sel.closest(".card")?.querySelector("button");
    if (!(addBtn instanceof HTMLElement)) throw new Error("add button missing");
    addBtn.click();
    // Wait for the store writes: unseen muscle → 2 warmups + 1 working set
    // join the 1 existing set (the select <option> already contains the name,
    // so only the committed sets prove the card build finished).
    await vi.waitFor(async () => {
      expect((await getSets(w.id)).length).toBe(4);
    });
    const card = exerciseCard(root, fresh.name);
    const rows = card.querySelectorAll("tbody tr.set-row");
    expect(rows.length).toBe(3);
    // Warmup ramp first: 12×8 + 17×3 off the 20 kg default working weight.
    const wu1 = rows[0];
    const wu2 = rows[1];
    const working = rows[2];
    if (!wu1 || !wu2 || !working) throw new Error("rows missing");
    expect(wu1.getAttribute("data-warmup")).toBe("true");
    expect(weightInput(wu1).value).toBe(String(displayWeight(12, "lb")));
    expect(wu2.getAttribute("data-warmup")).toBe("true");
    expect(weightInput(wu2).value).toBe(String(displayWeight(17, "lb")));
    expect(working.getAttribute("data-warmup")).toBeNull();
    expect(weightInput(working).value).toBe(String(displayWeight(20, "lb")));
    const reps = working.querySelector('[data-focus-key="reps"]');
    if (!(reps instanceof HTMLInputElement)) throw new Error("reps missing");
    expect(reps.value).toBe("8");
  });
});

describe("R4: rest auto-start wiring", () => {
  function spyRestTimer(): { starts: number[]; stops: () => number } {
    const origCreate = timerLib.createRestTimer;
    const starts: number[] = [];
    let stopCount = 0;
    vi.spyOn(timerLib, "createRestTimer").mockImplementation((opts) => {
      const t = origCreate(opts);
      const origStart = t.start.bind(t);
      const origStop = t.stop.bind(t);
      t.start = (s?: number): void => {
        starts.push(s ?? -1);
        origStart(s);
      };
      t.stop = (): void => {
        stopCount++;
        origStop();
      };
      return t;
    });
    return { starts, stops: () => stopCount };
  }

  it("false→true starts rest at settings.restSeconds; second completion restarts; Undo never stops", async () => {
    const ex = await seedExercise();
    await saveSettings({ units: "lb", restSeconds: 120 });
    const { starts, stops } = spyRestTimer();
    const w = await startWorkout({
      title: "T",
      items: [
        { exerciseId: ex.id, sets: [{ weightKg: 20, reps: 8 }, { weightKg: 20, reps: 8 }] },
      ],
    });
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const doneAt = (i: number): HTMLElement => {
      const rows = root.querySelectorAll("tbody tr.set-row");
      const row = rows[i];
      if (!row) throw new Error(`row ${i} missing`);
      return doneButton(row);
    };
    await vi.waitFor(() => {
      expect(root.querySelectorAll("tbody tr.set-row").length).toBe(2);
    });
    doneAt(0).click();
    await vi.waitFor(() => expect(starts).toEqual([120]));
    expect(root.querySelector(".rest-sticky")?.textContent).toContain("2:00");

    doneAt(1).click();
    await vi.waitFor(() => expect(starts).toEqual([120, 120]));

    doneAt(0).click(); // Undo the first set (re-queried: the row was replaced)
    await vi.waitFor(() => {
      const rows = root.querySelectorAll("tbody tr.set-row");
      expect(rows[0]?.getAttribute("data-completed")).toBe("false");
    });
    expect(stops()).toBe(0);
    expect(root.querySelector(".rest-sticky")?.textContent).not.toContain("Rest: idle");
  });
});

describe("R9: honest failure rollback", () => {
  it("failed save reverts the row, toasts, keeps the counter, skips the timer, returns focus", async () => {
    const ex = await seedExercise();
    await saveSettings({ units: "lb", restSeconds: 120 });
    const origCreate = timerLib.createRestTimer;
    const starts: number[] = [];
    vi.spyOn(timerLib, "createRestTimer").mockImplementation((opts) => {
      const t = origCreate(opts);
      const origStart = t.start.bind(t);
      t.start = (s?: number): void => {
        starts.push(s ?? -1);
        origStart(s);
      };
      return t;
    });
    const w = await startWorkout({
      title: "T",
      items: [{ exerciseId: ex.id, sets: [{ weightKg: 20, reps: 8 }] }],
    });
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    await vi.waitFor(() => {
      expect(root.querySelectorAll("tbody tr.set-row").length).toBe(1);
    });
    const row = root.querySelector("tbody tr.set-row");
    if (!(row instanceof HTMLElement)) throw new Error("row missing");
    const beforeHtml = row.outerHTML;
    const counterBefore = counterText(root);

    vi.spyOn(store, "upsertSet").mockRejectedValueOnce(new Error("boom"));
    const done = doneButton(row);
    done.focus();
    done.click();

    await vi.waitFor(() => {
      expect(document.getElementById("toast-root")?.textContent).toContain(
        "Couldn't save set",
      );
    });
    // patchRow() replaces the node: compare the LIVE row, not the detached ref.
    const liveRow = root.querySelector("tbody tr.set-row");
    expect(liveRow?.outerHTML).toBe(beforeHtml);
    expect(liveRow?.getAttribute("data-completed")).toBe("false");
    expect(counterText(root)).toBe(counterBefore);
    expect(starts).toEqual([]);
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("done");
    const stored = (await getSets(w.id))[0];
    expect(stored?.completed).toBe(false);
  });
});
