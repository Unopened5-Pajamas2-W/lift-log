/** v2 schema-migration vectors: v1 data → v2 upgrade creates the programs
 *  store, meta reads 2, existing rows intact; programs CRUD + seed. */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetDbConnection,
  deleteProgram,
  ensureSeeded,
  getDb,
  getProgram,
  getSets,
  listPrograms,
  saveProgram,
  startWorkout,
} from "../../src/lib/store.ts";
import { DB_NAME, SCHEMA_VERSION } from "../../src/lib/types.ts";
import type { Program } from "../../src/lib/types.ts";

const ALL_STORES = [
  "exercises",
  "workouts",
  "sets",
  "templates",
  "programs",
  "settings",
  "meta",
] as const;

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

beforeEach(async () => {
  await resetDb();
});

function makeProgram(id: string): Program {
  return {
    id,
    name: `Program ${id}`,
    weeks: [{ label: "Week 1", days: [{ name: "Day 1", items: [] }] }],
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("v1 → v2 migration", () => {
  it("opens at SCHEMA_VERSION with a programs store present", async () => {
    await ensureSeeded();
    const db = await getDb();
    expect(db.version).toBe(SCHEMA_VERSION);
    for (const s of ALL_STORES)
      expect(db.objectStoreNames.contains(s)).toBe(true);
  });

  it("keeps existing stores intact and seeds one example program", async () => {
    await ensureSeeded();
    const programs = await listPrograms();
    expect(programs.length).toBeGreaterThanOrEqual(1);
    const seeded = await getProgram("prog-531-beginners");
    expect(seeded?.name).toContain("5/3/1");
    expect(seeded?.weeks.length).toBe(4);
    // Re-seed is idempotent (insert-missing-only).
    await ensureSeeded();
    expect((await listPrograms(true)).length).toBe(programs.length);
  });

  it("meta records the new schema version only when absent", async () => {
    await ensureSeeded();
    const db = await getDb();
    const meta = await db.get("meta", "meta");
    expect(meta).toBeDefined();
  });
});

describe("program CRUD", () => {
  it("save / get / list / delete round-trips", async () => {
    await ensureSeeded();
    await saveProgram(makeProgram("p-x"));
    expect((await getProgram("p-x"))?.name).toBe("Program p-x");
    expect((await listPrograms()).some((p) => p.id === "p-x")).toBe(true);
    await deleteProgram("p-x");
    expect(await getProgram("p-x")).toBeUndefined();
  });

  it("listPrograms excludes archived unless asked", async () => {
    await ensureSeeded();
    const p = { ...makeProgram("p-arch"), isArchived: true };
    await saveProgram(p);
    expect((await listPrograms()).some((x) => x.id === "p-arch")).toBe(false);
    expect((await listPrograms(true)).some((x) => x.id === "p-arch")).toBe(
      true,
    );
  });
});

describe("workout program linkage", () => {
  it("startWorkout stamps programId/programWeek/programDayIndex", async () => {
    await ensureSeeded();
    const w = await startWorkout({
      title: "Program day",
      programId: "prog-531-beginners",
      programWeek: 0,
      programDayIndex: 1,
      items: [{ exerciseId: "back-squat", sets: [{ weightKg: 65, reps: 5 }] }],
    });
    expect(w.programId).toBe("prog-531-beginners");
    expect(w.programWeek).toBe(0);
    expect(w.programDayIndex).toBe(1);
    const sets = await getSets(w.id);
    expect(sets.length).toBe(1);
    expect(sets[0]?.weightKg).toBe(65);
  });
});
