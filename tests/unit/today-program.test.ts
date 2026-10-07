// @vitest-environment jsdom
/** Today-view program-card integration vectors: prescription preview, the
 *  unified autoregulated prefill (phase transforms + warmup ramps), program
 *  slot stamping, and the §8.3 weekly check-in deload flow. */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToday } from "../../src/views/today.ts";
import {
  __resetDbConnection,
  ensureSeeded,
  getSets,
  getWorkout,
  listWorkouts,
  loadSettings,
  saveSettings,
} from "../../src/lib/store.ts";
import { DB_NAME } from "../../src/lib/types.ts";

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

function cardByTitle(root: Element, title: string): HTMLElement {
  const cards = [...root.querySelectorAll("div.card")];
  const card = cards.find(
    (c) => c.querySelector("strong")?.textContent === title,
  );
  if (!(card instanceof HTMLElement)) throw new Error(`card missing: ${title}`);
  return card;
}

beforeEach(async () => {
  await resetDb();
  document.body.replaceChildren();
  const toastRoot = document.createElement("div");
  toastRoot.id = "toast-root";
  document.body.appendChild(toastRoot);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("Today: program card", () => {
  it("previews prescriptions and prefills a stamped session with warmups", async () => {
    await ensureSeeded();
    await saveSettings({ activeProgramId: "prog-sps-strength-base" });
    const root = await renderToday();
    document.body.appendChild(root);

    const card = cardByTitle(
      root,
      "Strength Base — volume → load → peak (example)",
    );
    const text = card.textContent ?? "";
    // Intro phase runs week 1 day 1; prescription lines render per item.
    expect(text).toContain("Week 1 · Day 1 — Squat + Push");
    expect(text).toContain("Barbell Back Squat");
    expect(text).toContain("RPE");
    // Intro transform: 3-set accessory bands scale to round(3 × 0.75) = 2 sets.
    const legPressLine = [...card.querySelectorAll("li")].find((li) =>
      (li.textContent ?? "").startsWith("Leg Press"),
    );
    expect(legPressLine?.textContent).toContain("2×8 @");

    const start = [...card.querySelectorAll("button")].find(
      (b) => b.textContent === "Start session",
    );
    if (!(start instanceof HTMLButtonElement)) throw new Error("start missing");
    start.click();

    await vi.waitFor(async () => {
      const [active] = await listWorkouts("active", 1000);
      expect(active).toBeDefined();
    });
    const [w] = await listWorkouts("active", 1000);
    if (!w) throw new Error("workout not started");
    const stored = await getWorkout(w.id);
    expect(stored?.programId).toBe("prog-sps-strength-base");
    expect(stored?.programWeek).toBe(0);
    expect(stored?.programDayIndex).toBe(0);
    expect(stored?.title).toBe("Strength Base — volume → load → peak (example) — Squat + Push");
    const sets = await getSets(w.id);
    const squat = sets.filter((s) => s.exerciseId === "back-squat");
    // Ramp (4 rows) + the intro-scaled single (1 set) at 0.85 × fallback TM 100.
    expect(squat.filter((s) => s.isWarmup === true)).toHaveLength(4);
    expect(squat.filter((s) => s.isWarmup !== true)).toEqual([
      expect.objectContaining({ weightKg: 85, reps: 1, completed: false }),
    ]);
    const legPress = sets.filter((s) => s.exerciseId === "leg-press");
    expect(legPress.filter((s) => s.isWarmup !== true)).toHaveLength(2);
  });

  it("intro week shows the eased RPE band and gauge-derived single weight", async () => {
    await ensureSeeded();
    await saveSettings({ activeProgramId: "prog-sps-strength-base" });
    const root = await renderToday();
    document.body.appendChild(root);
    const card = cardByTitle(
      root,
      "Strength Base — volume → load → peak (example)",
    );
    // Placeholder first-run weight (85 kg single) is gauge-driven; the RPE
    // band is eased to 5.5 by the intro phase.
    expect(card.textContent).toContain("85");
    expect(card.textContent).toContain("5.5");
  });
});

describe("Today: §8.3 weekly check-in", () => {
  it("2+ yes starts a deload week; banner shows while active", async () => {
    await ensureSeeded();
    await saveSettings({ activeProgramId: "prog-sps-strength-base" });
    const root = await renderToday();
    document.body.appendChild(root);

    const checkCard = cardByTitle(root, "Weekly check-in");
    const boxes = [
      ...checkCard.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ];
    expect(boxes).toHaveLength(5);
    boxes[0]!.checked = true;
    boxes[2]!.checked = true;
    const save = [...checkCard.querySelectorAll("button")].find(
      (b) => b.textContent === "Save check-in",
    );
    if (!(save instanceof HTMLButtonElement)) throw new Error("save missing");
    save.click();

    await vi.waitFor(async () => {
      const s = await loadSettings();
      expect(s.deloadUntil).toBeGreaterThan(0);
      expect(s.lastCheckIn?.yesCount).toBe(2);
    });
    const re = await renderToday();
    document.body.appendChild(re);
    expect((re.textContent ?? "")).toContain("Deload week active");
    // The program card flags the running deload.
    expect((re.textContent ?? "")).toContain("deload: sets −40%");
    // Loads are kept: the squat single still prefills 85 kg (deload scale 0.6
    // never stacks with intro — the more conservative cut wins).
    const card = cardByTitle(re, "Strength Base — volume → load → peak (example)");
    expect(card.textContent).toContain("85");
  });
});
