/** Data-safety vectors: seeding, atomicity, merge, malformed imports (spec §7). */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_BACKUP_CHARS,
  MAX_BACKUP_ROWS,
  exportJson,
  importJson,
  parseBackup,
  validateRestore,
} from "../../src/lib/backup.ts";
import {
  __resetDbConnection,
  deleteWorkout,
  dumpAll,
  ensureSeeded,
  getDb,
  getExercise,
  getSets,
  getWorkout,
  listExercises,
  listTemplates,
  listWorkouts,
  restoreAll,
  saveExercise,
  saveTemplate,
  startWorkout,
  wipeAll,
} from "../../src/lib/store.ts";
import { DB_NAME } from "../../src/lib/types.ts";
import type { Exercise } from "../../src/lib/types.ts";

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

/** Throw on the Nth object-store put; returns a restore function. */
function failOnNthPut(n: number, message = "injected fault"): () => void {
  const proto = IDBObjectStore.prototype;
  const orig = proto.put;
  let calls = 0;
  proto.put = function (
    this: IDBObjectStore,
    value: unknown,
    key?: IDBValidKey,
  ) {
    calls += 1;
    if (calls === n) throw new Error(message);
    return orig.call(this, value, key);
  };
  return () => {
    proto.put = orig;
  };
}

function makeExerciseRow(
  id: string,
  updatedAt: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    name: `Ex ${id}`,
    primaryMuscle: "chest",
    secondaryMuscles: [],
    equipment: "barbell",
    difficulty: "beginner",
    instructions: ["lift"],
    isCustom: true,
    isArchived: false,
    createdAt: 1,
    updatedAt,
    ...extra,
  };
}

describe("seeding (R1)", () => {
  it("never modifies existing rows on re-seed", async () => {
    await ensureSeeded();
    const before = await listExercises(true);
    expect(before.length).toBeGreaterThan(0);
    const first = before[0];
    if (!first) throw new Error("no seed exercises");
    await saveExercise({
      ...first,
      name: "Renamed by user",
      isArchived: true,
      updatedAt: Date.now() + 1000,
    });
    const templates = await listTemplates();
    const tpl = templates[0];
    if (!tpl) throw new Error("no seed templates");
    await saveTemplate({ ...tpl, name: "My Template" });

    await ensureSeeded();

    const after = await listExercises(true);
    expect(after.length).toBe(before.length);
    const kept = await getExercise(first.id);
    expect(kept?.name).toBe("Renamed by user");
    expect(kept?.isArchived).toBe(true);
    expect(kept?.createdAt).toBe(first.createdAt);
    const tplAfter = (await listTemplates()).find((t) => t.id === tpl.id);
    expect(tplAfter?.name).toBe("My Template");
  });

  it("custom rows survive reseeding", async () => {
    await ensureSeeded();
    const custom: Exercise = {
      id: "custom-carry",
      name: "Zercher Carry",
      primaryMuscle: "fullbody",
      secondaryMuscles: [],
      equipment: "barbell",
      difficulty: "intermediate",
      instructions: ["carry"],
      isCustom: true,
      isArchived: false,
      createdAt: 1,
      updatedAt: 1,
    };
    await saveExercise(custom);
    await ensureSeeded();
    expect((await getExercise("custom-carry"))?.name).toBe("Zercher Carry");
  });
});

describe("atomicity (R2)", () => {
  it("startWorkout rolls back the workout when a set write fails", async () => {
    await ensureSeeded();
    const restore = failOnNthPut(2);
    try {
      await expect(
        startWorkout({
          title: "Doomed",
          items: [
            {
              exerciseId: "x",
              sets: [
                { weightKg: 20, reps: 8 },
                { weightKg: 20, reps: 8 },
              ],
            },
          ],
        }),
      ).rejects.toThrow("injected fault");
    } finally {
      restore();
    }
    expect(await listWorkouts()).toHaveLength(0);
    expect((await dumpAll()).sets ?? []).toHaveLength(0);
  });

  it("deleteWorkout removes the workout and its sets together", async () => {
    await ensureSeeded();
    const w = await startWorkout({
      title: "Temp",
      items: [{ exerciseId: "x", sets: [{ weightKg: 20, reps: 8 }] }],
    });
    expect(await getSets(w.id)).toHaveLength(1);
    await deleteWorkout(w.id);
    expect(await getWorkout(w.id)).toBeUndefined();
    expect(await getSets(w.id)).toHaveLength(0);
  });

  it("restoreAll leaves the DB untouched when a write fails", async () => {
    await ensureSeeded();
    const w = await startWorkout({ title: "Keep me" });
    const before = JSON.stringify(await dumpAll());
    const restore = failOnNthPut(2);
    try {
      await expect(
        restoreAll({
          exercises: [
            makeExerciseRow("new-ex-1", 5),
            makeExerciseRow("new-ex-2", 6),
          ],
          workouts: [
            { id: "new-w-1", title: "W", startedAt: 7, status: "completed" },
          ],
        }),
      ).rejects.toThrow("injected fault");
    } finally {
      restore();
    }
    expect(JSON.stringify(await dumpAll())).toBe(before);
    expect((await getWorkout(w.id))?.id).toBe(w.id);
  });
});

describe("merge honesty (R4/R5)", () => {
  it("incoming rows win only when strictly newer; re-import is a no-op", async () => {
    await ensureSeeded();
    const base: Exercise = {
      id: "ex-merge",
      name: "Merge Press",
      primaryMuscle: "chest",
      secondaryMuscles: [],
      equipment: "barbell",
      difficulty: "beginner",
      instructions: ["lift"],
      isCustom: true,
      isArchived: false,
      createdAt: 1,
      updatedAt: 100,
    };
    await saveExercise(base);

    const older = await restoreAll({
      exercises: [{ ...makeExerciseRow("ex-merge", 90), name: "Older" }],
    });
    expect(older.exercises).toMatchObject({
      inserted: 0,
      updated: 0,
      skipped: 1,
      invalid: 0,
    });
    const same = await restoreAll({
      exercises: [{ ...makeExerciseRow("ex-merge", 100), name: "Same" }],
    });
    expect(same.exercises.skipped).toBe(1);
    expect((await getExercise("ex-merge"))?.name).toBe("Merge Press");

    const newer = await restoreAll({
      exercises: [
        {
          ...makeExerciseRow("ex-merge", 101),
          name: "Newer",
          futureFlag: true,
        },
      ],
    });
    expect(newer.exercises).toMatchObject({ updated: 1 });
    const kept = await getExercise("ex-merge");
    expect(kept?.name).toBe("Newer");
    expect((kept as unknown as Record<string, unknown>)?.futureFlag).toBe(true);

    const again = await restoreAll({
      exercises: [
        {
          ...makeExerciseRow("ex-merge", 101),
          name: "Newer",
          futureFlag: true,
        },
      ],
    });
    expect(again.exercises).toMatchObject({
      inserted: 0,
      updated: 0,
      skipped: 1,
      invalid: 0,
    });
  });

  it("counts invalid rows and ignores unknown stores without writing", async () => {
    await ensureSeeded();
    const before = JSON.stringify(await dumpAll());
    const result = await restoreAll({
      exercises: [
        { name: "missing id" },
        { id: "", name: "empty id" },
        { id: "bad-ex", name: 42 },
      ],
      sets: [{ id: "bad-set", weightKg: "heavy" }],
      workouts: [{ id: "bad-w", title: "T", startedAt: 1, status: "nope" }],
      templates: [{ id: "bad-t", name: "T", items: "nope" }],
      meta: [{ name: "no id" }],
      futureStore: [{ id: "a" }],
    });
    expect(result.exercises.invalid).toBe(3);
    expect(result.sets.invalid).toBe(1);
    expect(result.workouts.invalid).toBe(1);
    expect(result.templates.invalid).toBe(1);
    expect(result.meta.invalid).toBe(1);
    expect(result.unknownStores).toEqual(["futureStore"]);
    expect(result.workouts.inserted).toBe(0);
    expect(JSON.stringify(await dumpAll())).toBe(before);
  });

  it("importJson round-trips a dump and reports honestly on re-import", async () => {
    await ensureSeeded();
    const w = await startWorkout({
      title: "Round trip",
      items: [{ exerciseId: "x", sets: [{ weightKg: 60, reps: 8 }] }],
    });
    const file = JSON.stringify(await exportJson());
    await wipeAll();
    expect(await listWorkouts()).toHaveLength(0);

    const first = await importJson(file);
    let inserted = 0;
    for (const store of ALL_STORES) inserted += first[store].inserted;
    expect(inserted).toBeGreaterThan(0);
    expect((await getWorkout(w.id))?.title).toBe("Round trip");

    const second = await importJson(file);
    let inserted2 = 0;
    let updated2 = 0;
    for (const store of ALL_STORES) {
      inserted2 += second[store].inserted;
      updated2 += second[store].updated;
    }
    expect(inserted2).toBe(0);
    expect(updated2).toBe(0);
  });
});

describe("import guards (R3/R10)", () => {
  it("parseBackup rejects oversized files and over-limit row counts", () => {
    expect(() => parseBackup("x".repeat(MAX_BACKUP_CHARS + 1))).toThrow(
      /too large/,
    );
    const rows: unknown[] = [];
    for (let i = 0; i < MAX_BACKUP_ROWS + 1; i += 1)
      rows.push({ id: `w-${i}` });
    expect(() =>
      parseBackup(
        JSON.stringify({
          app: "lift-log",
          schemaVersion: 1,
          exportedAt: 0,
          data: { workouts: rows },
        }),
      ),
    ).toThrow(/too many rows/);
  });

  it("validateRestore splits good rows from bad without throwing", () => {
    const { valid, invalid, unknownStores } = validateRestore({
      sets: [
        {
          id: "ok",
          workoutId: "w",
          exerciseId: "e",
          weightKg: 60,
          reps: 8,
          completed: true,
          order: 0,
          createdAt: 1,
        },
        {
          id: "bad",
          workoutId: "w",
          exerciseId: "e",
          weightKg: "heavy",
          reps: 8,
          completed: true,
          order: 0,
          createdAt: 1,
        },
      ],
      workouts: [{ id: "w1", title: "T", startedAt: 1, status: "completed" }],
      mystery: [{ id: "m" }],
    });
    expect(valid.sets).toHaveLength(1);
    expect(invalid).toMatchObject({ sets: 1 });
    expect(unknownStores).toEqual(["mystery"]);
  });
});

describe("connection (R6)", () => {
  it("getDb creates all stores and indexes on first open", async () => {
    const db = await getDb();
    expect([...db.objectStoreNames].sort()).toEqual([...ALL_STORES].sort());
    const tx = db.transaction(["exercises", "sets", "workouts"]);
    const exercises = tx.objectStore("exercises");
    expect(exercises.indexNames.contains("by-muscle")).toBe(true);
    expect(exercises.indexNames.contains("by-equipment")).toBe(true);
    const sets = tx.objectStore("sets");
    expect(sets.indexNames.contains("by-workoutId")).toBe(true);
    expect(sets.indexNames.contains("by-exerciseId")).toBe(true);
    expect(tx.objectStore("workouts").indexNames.contains("by-startedAt")).toBe(
      true,
    );
  });

  it("getDb retries after an open failure instead of caching the rejection", async () => {
    const spy = vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
      throw new Error("nope");
    });
    await expect(getDb()).rejects.toThrow("nope");
    spy.mockRestore();
    const db = await getDb();
    expect(db.name).toBe(DB_NAME);
  });
});

describe("singleton (R9)", () => {
  it("concurrent starts share a single active workout", async () => {
    await ensureSeeded();
    const [a, b] = await Promise.all([
      startWorkout({ title: "First" }),
      startWorkout({ title: "Second" }),
    ]);
    expect(a.id).toBe(b.id);
    expect(
      (await listWorkouts()).filter((w) => w.status === "active"),
    ).toHaveLength(1);
  });
});
