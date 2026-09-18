// @vitest-environment jsdom
/** Swap vectors: keep-done/swap-rest semantics (R5), substitute insertion
 *  position + prefill (R6), confirm gating (R5/E1/E2), declined no-op, and
 *  honest failure resync (R7). Real store on fake-indexeddb; real timers
 *  (IDB does not advance on fake clocks). Spec: exercise-swap-20260918. */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWorkout } from "../../src/views/workout.ts";
import {
  __resetDbConnection,
  ensureSeeded,
  getExercise,
  getSets,
  listExercises,
  saveSettings,
  startWorkout,
  upsertSet,
} from "../../src/lib/store.ts";
import { restoreTitle } from "../../src/lib/timer.ts";
import { DB_NAME } from "../../src/lib/types.ts";
import type { Exercise, Workout, WorkoutSet } from "../../src/lib/types.ts";

// jsdom has no <dialog> implementation; the polyfill mirrors what the native
// methods do (toggle open attribute, fire the close event). Production Safari
// uses the native methods untouched. Same polyfill as exercise-info.test.ts.
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
let confirmCalls = 0;
let confirmResult = true;

beforeEach(async () => {
  await resetDb();
  document.body.replaceChildren();
  document.title = "Lift Log";
  restoreTitle();
  document.title = "Lift Log";
  window.onbeforeunload = null;
  savedConfirm = window.confirm;
  confirmCalls = 0;
  confirmResult = true;
  window.confirm = () => {
    confirmCalls += 1;
    return confirmResult;
  };
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

/** Throw on the Nth object-store delete; returns a restore function. */
function failOnNthDelete(n: number, message = "injected fault"): () => void {
  const proto = IDBObjectStore.prototype;
  const orig = proto.delete;
  let calls = 0;
  proto.delete = function (this: IDBObjectStore, key: IDBValidKey) {
    calls += 1;
    if (calls === n) throw new Error(message);
    return orig.call(this, key);
  };
  return () => {
    proto.delete = orig;
  };
}

const OUT_ID = "dumbbell-bench-press";
const SUB_ID = "incline-dumbbell-press";

async function exercise(id: string): Promise<Exercise> {
  const ex = await getExercise(id);
  if (!ex) throw new Error(`missing exercise: ${id}`);
  return ex;
}

async function startSeeded(): Promise<Workout> {
  await ensureSeeded();
  await saveSettings({ units: "kg" });
  return startWorkout({ title: "T" });
}

async function seedWorkout(
  sets: Pick<WorkoutSet, "weightKg" | "reps" | "completed" | "isWarmup">[],
): Promise<Workout> {
  const w = await startSeeded();
  let order = 0;
  for (const s of sets) {
    await upsertSet({
      id: crypto.randomUUID(),
      workoutId: w.id,
      exerciseId: OUT_ID,
      order: order++,
      weightKg: s.weightKg,
      reps: s.reps,
      completed: s.completed,
      ...(s.isWarmup === true ? { isWarmup: true as const } : {}),
      createdAt: Date.now(),
    });
  }
  return w;
}

function nullableCard(root: Element, name: string): HTMLElement | null {
  const cards = [...root.querySelectorAll("div.card")];
  return (
    (cards.find(
      (c) => c.querySelector(":scope > .row > strong")?.textContent === name,
    ) as HTMLElement | undefined) ?? null
  );
}

function card(root: Element, name: string): HTMLElement {
  const cards = [...root.querySelectorAll("div.card")];
  const found = cards.find(
    (c) => c.querySelector(":scope > .row > strong")?.textContent === name,
  );
  if (!(found instanceof HTMLElement)) throw new Error(`card missing: ${name}`);
  return found;
}

async function swapViaUi(root: HTMLElement, sub: Exercise): Promise<void> {
  const out = await exercise(OUT_ID);
  const swapBtn = card(root, out.name).querySelector(
    `button[aria-label="Swap ${out.name} for a different exercise"]`,
  );
  if (!(swapBtn instanceof HTMLElement)) throw new Error("swap button missing");
  swapBtn.click();
  await vi.waitFor(() => {
    expect(document.querySelector("dialog.sheet")).not.toBeNull();
  });
  const sheet = document.querySelector("dialog.sheet");
  if (!(sheet instanceof HTMLElement)) throw new Error("sheet missing");
  const row = [...sheet.querySelectorAll("button.sheet-row")].find(
    (b) => b.querySelector("strong")?.textContent === sub.name,
  );
  if (!(row instanceof HTMLElement))
    throw new Error(`substitute row missing: ${sub.name}`);
  row.click();
}

describe("swap: keep-done / swap-rest", () => {
  it("keeps completed sets on the old card, deletes unlogged only, inserts substitute after it", async () => {
    const w = await seedWorkout([
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 7, completed: true },
      { weightKg: 60, reps: 0, completed: false },
    ]);
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const out = await exercise(OUT_ID);
    const sub = await exercise(SUB_ID);

    await swapViaUi(root, sub);

    await vi.waitFor(async () => {
      const all = await getSets(w.id);
      const outSets = all.filter((s) => s.exerciseId === OUT_ID);
      const subSets = all.filter((s) => s.exerciseId === SUB_ID);
      expect(outSets).toHaveLength(2);
      expect(outSets.every((s) => s.completed)).toBe(true);
      expect(subSets).toHaveLength(1);
      expect(subSets[0]?.completed).toBe(false);
      expect(subSets[0]?.isWarmup).toBeUndefined(); // chest already trained
      expect(subSets[0]?.weightKg).toBe(20); // no history → Add-prefill default
    });
    expect(confirmCalls).toBe(1); // 1 unfinished working set
    const outCard = card(root, out.name);
    expect(outCard.querySelectorAll("tbody tr")).toHaveLength(2);
    const subCard = card(root, sub.name);
    expect(subCard.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(outCard.nextElementSibling).toBe(subCard); // position preserved
    expect(root.querySelector("header.topbar span.muted")?.textContent).toBe(
      "2/3 sets",
    );
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("done");
    expect(outCard.contains(document.activeElement)).toBe(false);
    expect(subCard.contains(document.activeElement)).toBe(true);
    expect(document.querySelector("dialog.sheet")).toBeNull(); // sheet removed
  });

  it("E1: all sets completed → no confirm, old card stays, substitute appended after it", async () => {
    const w = await seedWorkout([
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 8, completed: true },
    ]);
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const sub = await exercise(SUB_ID);

    await swapViaUi(root, sub);

    expect(confirmCalls).toBe(0);
    await vi.waitFor(async () => {
      const all = await getSets(w.id);
      expect(all.filter((s) => s.exerciseId === OUT_ID)).toHaveLength(2);
      expect(all.filter((s) => s.exerciseId === SUB_ID)).toHaveLength(1);
    });
    const outCard = card(root, await exercise(OUT_ID).then((e) => e.name));
    expect(outCard.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(outCard.nextElementSibling).toBe(card(root, sub.name));
  });

  it("E2: only warmups unlogged → deletes them without confirm, no confirm count", async () => {
    const w = await seedWorkout([
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 36, reps: 8, completed: false, isWarmup: true },
    ]);
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const sub = await exercise(SUB_ID);

    await swapViaUi(root, sub);

    expect(confirmCalls).toBe(0);
    await vi.waitFor(async () => {
      const all = await getSets(w.id);
      const outSets = all.filter((s) => s.exerciseId === OUT_ID);
      expect(outSets).toHaveLength(1);
      expect(outSets[0]?.completed).toBe(true);
      expect(all.filter((s) => s.exerciseId === SUB_ID)).toHaveLength(1);
    });
    expect(confirmCalls).toBe(0);
  });

  it("declined confirm is a no-op: nothing deleted, nothing added", async () => {
    const w = await seedWorkout([
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 0, completed: false },
    ]);
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const sub = await exercise(SUB_ID);
    confirmResult = false;

    await swapViaUi(root, sub);

    await new Promise((r) => setTimeout(r, 20));
    expect(confirmCalls).toBe(1);
    const all = await getSets(w.id);
    expect(all.filter((s) => s.exerciseId === OUT_ID)).toHaveLength(2);
    expect(all.filter((s) => s.exerciseId === SUB_ID)).toHaveLength(0);
  });

  it("substitute with an unseen muscle arrives with the warmup ramp", async () => {
    const w = await seedWorkout([{ weightKg: 60, reps: 8, completed: false }]);
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const shouldersEx = (await listExercises(false)).find(
      (e) => e.primaryMuscle === "shoulders" && e.equipment === "dumbbell",
    );
    if (!shouldersEx)
      throw new Error("no dumbbell shoulders exercise in seeds");

    await swapViaUi(root, shouldersEx);

    await vi.waitFor(async () => {
      const all = await getSets(w.id);
      const subSets = all.filter((s) => s.exerciseId === shouldersEx.id);
      expect(subSets.length).toBe(3); // 8×60% + 3×85% + working
      expect(subSets.filter((s) => s.isWarmup === true)).toHaveLength(2);
    });
    expect(confirmCalls).toBe(1);
  });

  it("E3: swapping the only exercise keeps the substitute before the Add card", async () => {
    const w = await seedWorkout([{ weightKg: 60, reps: 8, completed: false }]);
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const sub = await exercise(SUB_ID);

    await swapViaUi(root, sub);

    await vi.waitFor(() => {
      expect(nullableCard(root, sub.name)).not.toBeNull();
    });
    const addCard = [...root.querySelectorAll("div.card")].find(
      (c) => c.querySelector("strong")?.textContent === "Add exercise",
    );
    expect(addCard).toBeDefined();
    expect(addCard?.previousElementSibling).toBe(card(root, sub.name));
    expect(nullableCard(root, (await exercise(OUT_ID)).name)).toBeNull();
  });

  it("R7: delete failure resyncs from what persisted and toasts", async () => {
    const w = await seedWorkout([
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 0, completed: false },
    ]);
    const root = await renderWorkout(w.id);
    document.body.appendChild(root);
    const out = await exercise(OUT_ID);
    const restore = failOnNthDelete(1);

    try {
      await swapViaUi(root, await exercise(SUB_ID));
      await vi.waitFor(() => {
        const toasts = document.getElementById("toast-root");
        expect(toasts?.textContent).toContain("Couldn't swap");
      });
    } finally {
      restore();
    }

    const all = await getSets(w.id);
    expect(all.filter((s) => s.exerciseId === SUB_ID)).toHaveLength(0);
    const outSets = all.filter((s) => s.exerciseId === OUT_ID);
    expect(outSets).toHaveLength(2); // delete failed → unlogged set survives
    expect(card(root, out.name).querySelectorAll("tbody tr")).toHaveLength(2);
  });
});
