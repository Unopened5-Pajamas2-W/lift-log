/** Persistent store: IndexedDB CRUD, seed import, singleton active workout. */
import {
  deleteOne,
  getAll,
  getAllByIndex,
  getOne,
  openDb,
  putAll,
  putOne,
  runTx,
} from "./db.ts";
import { validateRestore } from "./backup.ts";
import type { RestoreResult, ValidRow } from "./backup.ts";
import { ALL_EQUIPMENT } from "../data/muscles.ts";
import seedExercises from "../data/exercises.json";
import seedTemplates from "../data/templates.json";
import type {
  Equipment,
  Exercise,
  Settings,
  Template,
  Workout,
  WorkoutSet,
} from "./types.ts";
import { DB_NAME, SCHEMA_VERSION } from "./types.ts";

export const STORES = [
  "exercises",
  "workouts",
  "sets",
  "templates",
  "settings",
  "meta",
] as const;

let dbPromise: Promise<IDBDatabase> | null = null;
let liveDb: IDBDatabase | null = null;

function upgradeDb(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains("exercises")) {
    const os = db.createObjectStore("exercises", { keyPath: "id" });
    os.createIndex("by-muscle", "primaryMuscle", { unique: false });
    os.createIndex("by-equipment", "equipment", { unique: false });
  }
  if (!db.objectStoreNames.contains("workouts")) {
    const os = db.createObjectStore("workouts", { keyPath: "id" });
    os.createIndex("by-startedAt", "startedAt", { unique: false });
  }
  if (!db.objectStoreNames.contains("sets")) {
    const os = db.createObjectStore("sets", { keyPath: "id" });
    os.createIndex("by-workoutId", "workoutId", { unique: false });
    os.createIndex("by-exerciseId", "exerciseId", { unique: false });
  }
  if (!db.objectStoreNames.contains("templates"))
    db.createObjectStore("templates", { keyPath: "id" });
  if (!db.objectStoreNames.contains("settings"))
    db.createObjectStore("settings", { keyPath: "id" });
  if (!db.objectStoreNames.contains("meta"))
    db.createObjectStore("meta", { keyPath: "id" });
}

export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb(DB_NAME, SCHEMA_VERSION, (db) => upgradeDb(db)).then(
      (db) => {
        liveDb = db;
        db.onversionchange = () => {
          db.close();
          liveDb = null;
          dbPromise = null;
        };
        return db;
      },
      (err) => {
        // Never cache a rejection: the next caller retries the open.
        dbPromise = null;
        liveDb = null;
        throw err;
      },
    );
  }
  return dbPromise;
}

/** Test-only: close the cached connection so tests can isolate per case. */
export function __resetDbConnection(): void {
  try {
    liveDb?.close();
  } catch {
    /* already closed */
  }
  liveDb = null;
  dbPromise = null;
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function defaultSettings(): Settings {
  return {
    id: "app",
    units: "lb",
    equipment: [...ALL_EQUIPMENT],
    restSeconds: 90,
    barWeightKg: 20,
    recoveryOverrides: {},
    disclaimerAccepted: false,
  };
}

export async function ensureSeeded(): Promise<void> {
  const db = await getDb();
  // Insert-missing-only: never modify an existing row, so user edits to
  // seeded exercises/templates (rename, archive) survive relaunches.
  // Future seed-content updates require an explicit versioned migration,
  // never a silent overwrite here.
  const now = Date.now();
  const exerciseIds = new Set(
    (await getAll<{ id: string }>(db, "exercises")).map((e) => e.id),
  );
  const missingExercises: Exercise[] = (
    seedExercises as Omit<
      Exercise,
      "isCustom" | "isArchived" | "createdAt" | "updatedAt"
    >[]
  )
    .filter((e) => !exerciseIds.has(e.id))
    .map((e) => ({
      ...e,
      isCustom: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    }));
  await putAll(db, "exercises", missingExercises);
  const templateIds = new Set(
    (await getAll<{ id: string }>(db, "templates")).map((t) => t.id),
  );
  const missingTemplates: Template[] = (
    seedTemplates as Omit<Template, "createdAt" | "updatedAt">[]
  )
    .filter((t) => !templateIds.has(t.id))
    .map((t) => ({
      ...t,
      createdAt: now,
      updatedAt: now,
    }));
  await putAll(db, "templates", missingTemplates);
  const settings = await getOne<Settings>(db, "settings", "app");
  if (!settings) await putOne(db, "settings", defaultSettings());
  const meta = await getOne(db, "meta", "meta");
  if (!meta)
    await putOne(db, "meta", { id: "meta", schemaVersion: SCHEMA_VERSION });
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.persist)
      await navigator.storage.persist();
  } catch {
    /* best-effort */
  }
}

// --- settings ---
export async function loadSettings(): Promise<Settings> {
  const db = await getDb();
  const s = await getOne<Settings>(db, "settings", "app");
  // Additive defaults: pre-existing settings rows gain new fields (barWeightKg)
  // without a migration.
  return { ...defaultSettings(), ...s, id: "app" as const };
}

export async function saveSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const db = await getDb();
  const cur =
    (await getOne<Settings>(db, "settings", "app")) ?? defaultSettings();
  const next = { ...cur, ...patch, id: "app" as const };
  await putOne(db, "settings", next);
  return next;
}

// --- exercises ---
export async function listExercises(
  includeArchived = false,
): Promise<Exercise[]> {
  const db = await getDb();
  const all = await getAll<Exercise>(db, "exercises");
  const list = includeArchived ? all : all.filter((e) => !e.isArchived);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  const db = await getDb();
  return getOne<Exercise>(db, "exercises", id);
}

export async function saveExercise(ex: Exercise): Promise<void> {
  const db = await getDb();
  await putOne(db, "exercises", ex);
}

export async function archiveExercise(
  id: string,
  archived: boolean,
): Promise<void> {
  const ex = await getExercise(id);
  if (!ex) return;
  await saveExercise({ ...ex, isArchived: archived, updatedAt: Date.now() });
}

export async function searchExercises(
  q: string,
  muscle?: string,
  equipment?: Equipment,
): Promise<Exercise[]> {
  const all = await listExercises(false);
  const needle = q.trim().toLowerCase();
  return all.filter(
    (e) =>
      (!needle || e.name.toLowerCase().includes(needle)) &&
      (!muscle ||
        e.primaryMuscle === muscle ||
        e.secondaryMuscles.includes(muscle as Exercise["primaryMuscle"])) &&
      (!equipment || e.equipment === equipment || e.equipment === "bodyweight"),
  );
}

// --- workouts + sets ---
export async function getActiveWorkout(): Promise<Workout | undefined> {
  const db = await getDb();
  const all = await getAll<Workout>(db, "workouts");
  return all.find((w) => w.status === "active");
}

/** In-flight start guard: rapid double-taps share one creation. */
let starting: Promise<Workout> | null = null;

export function startWorkout(input: {
  title: string;
  templateId?: string;
  seed?: number;
  items?: {
    exerciseId: string;
    sets: { weightKg: number; reps: number; isWarmup?: boolean }[];
  }[];
}): Promise<Workout> {
  if (!starting) {
    starting = startWorkoutInner(input).finally(() => {
      starting = null;
    });
  }
  return starting;
}

async function startWorkoutInner(input: {
  title: string;
  templateId?: string;
  seed?: number;
  items?: {
    exerciseId: string;
    sets: { weightKg: number; reps: number; isWarmup?: boolean }[];
  }[];
}): Promise<Workout> {
  const existing = await getActiveWorkout();
  if (existing) return existing; // singleton invariant
  const db = await getDb();
  const now = Date.now();
  const workout: Workout = {
    id: uuid(),
    title: input.title || "Workout",
    startedAt: now,
    status: "active",
    templateId: input.templateId,
    seed: input.seed,
  };
  const sets: WorkoutSet[] = [];
  if (input.items) {
    let order = 0;
    for (const item of input.items) {
      for (const s of item.sets) {
        sets.push({
          id: uuid(),
          workoutId: workout.id,
          exerciseId: item.exerciseId,
          order: order++,
          weightKg: s.weightKg,
          reps: s.reps,
          completed: false,
          ...(s.isWarmup === true ? { isWarmup: true as const } : {}),
          createdAt: now,
        });
      }
    }
  }
  // Single transaction: a crash leaves no phantom-empty workout behind.
  await runTx(db, ["workouts", "sets"], "readwrite", (tx) => {
    tx.objectStore("workouts").put(workout);
    if (sets.length > 0) {
      const os = tx.objectStore("sets");
      for (const s of sets) os.put(s);
    }
  });
  return workout;
}

export async function getWorkout(id: string): Promise<Workout | undefined> {
  const db = await getDb();
  return getOne<Workout>(db, "workouts", id);
}

export async function listWorkouts(
  status?: Workout["status"],
  limit = 200,
): Promise<Workout[]> {
  const db = await getDb();
  const all = await getAll<Workout>(db, "workouts");
  const list = status ? all.filter((w) => w.status === status) : all;
  return list.sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
}

export async function updateWorkout(patch: Workout): Promise<void> {
  const db = await getDb();
  await putOne(db, "workouts", patch);
}

export async function finishWorkout(id: string): Promise<void> {
  const w = await getWorkout(id);
  if (!w) return;
  await updateWorkout({ ...w, status: "completed", endedAt: Date.now() });
}

export async function discardWorkout(id: string): Promise<void> {
  const w = await getWorkout(id);
  if (!w) return;
  await updateWorkout({ ...w, status: "discarded", endedAt: Date.now() });
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDb();
  const sets = await getAllByIndex<WorkoutSet>(db, "sets", "by-workoutId", id);
  // Single transaction: never strand orphan sets on crash.
  await runTx(db, ["workouts", "sets"], "readwrite", (tx) => {
    tx.objectStore("workouts").delete(id);
    const os = tx.objectStore("sets");
    for (const s of sets) os.delete(s.id);
  });
}

export async function getSets(workoutId: string): Promise<WorkoutSet[]> {
  const db = await getDb();
  const sets = await getAllByIndex<WorkoutSet>(
    db,
    "sets",
    "by-workoutId",
    workoutId,
  );
  return sets.sort((a, b) => a.order - b.order);
}

export async function getSetsForExercise(
  exerciseId: string,
): Promise<WorkoutSet[]> {
  const db = await getDb();
  const sets = await getAllByIndex<WorkoutSet>(
    db,
    "sets",
    "by-exerciseId",
    exerciseId,
  );
  return sets.sort((a, b) => a.createdAt - b.createdAt);
}

export async function upsertSet(set: WorkoutSet): Promise<void> {
  const db = await getDb();
  await putOne(db, "sets", set);
}

export async function deleteSet(id: string): Promise<void> {
  const db = await getDb();
  await deleteOne(db, "sets", id);
}

export async function allCompletedSets(): Promise<WorkoutSet[]> {
  const db = await getDb();
  const workouts = await getAll<Workout>(db, "workouts");
  const done = new Set(
    workouts.filter((w) => w.status === "completed").map((w) => w.id),
  );
  const sets = await getAll<WorkoutSet>(db, "sets");
  return sets.filter((s) => done.has(s.workoutId) && s.completed);
}

// --- templates ---
export async function listTemplates(): Promise<Template[]> {
  const db = await getDb();
  const all = await getAll<Template>(db, "templates");
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveTemplate(t: Template): Promise<void> {
  const db = await getDb();
  await putOne(db, "templates", t);
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDb();
  await deleteOne(db, "templates", id);
}

/** Full dump for backup export (v2: preserve unknown fields). */
export async function dumpAll(): Promise<Record<string, unknown[]>> {
  const db = await getDb();
  const out: Record<string, unknown[]> = {};
  for (const s of STORES) out[s] = await getAll(db, s);
  return out;
}

export async function restoreAll(
  data: Record<string, unknown[]>,
): Promise<RestoreResult> {
  // Validate before touching the DB: invalid rows never fail the import.
  const { valid, invalid, unknownStores } = validateRestore(data);
  const db = await getDb();
  const result = {} as RestoreResult;
  for (const s of STORES) {
    result[s] = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      invalid: invalid[s] ?? 0,
    };
  }
  // Diff in memory, then write everything in one atomic transaction.
  const toWrite: Partial<Record<(typeof STORES)[number], ValidRow[]>> = {};
  for (const s of STORES) {
    const rows = valid[s];
    if (!rows || rows.length === 0) continue;
    const existing = await getAll<{ id: string; updatedAt?: unknown }>(db, s);
    const byId = new Map(existing.map((e) => [e.id, e]));
    const writes: ValidRow[] = [];
    for (const row of rows) {
      const cur = byId.get(row.id);
      if (!cur) {
        writes.push(row);
        result[s].inserted += 1;
        continue;
      }
      // Last-write-wins by updatedAt; ties and missing stamps keep existing.
      const incomingTs = row.updatedAt;
      const currentTs = cur.updatedAt;
      if (
        typeof incomingTs === "number" &&
        Number.isFinite(incomingTs) &&
        (typeof currentTs !== "number" || incomingTs > currentTs)
      ) {
        writes.push(row);
        result[s].updated += 1;
      } else {
        result[s].skipped += 1;
      }
    }
    if (writes.length > 0) toWrite[s] = writes;
  }
  const targets = (Object.keys(toWrite) as (typeof STORES)[number][]).filter(
    (s) => (toWrite[s]?.length ?? 0) > 0,
  );
  if (targets.length > 0) {
    await runTx(db, targets, "readwrite", (tx) => {
      for (const s of targets) {
        const os = tx.objectStore(s);
        for (const row of toWrite[s] ?? []) os.put(row);
      }
    });
  }
  return { ...result, unknownStores };
}

export async function wipeAll(): Promise<void> {
  const db = await getDb();
  await runTx(db, [...STORES], "readwrite", (tx) => {
    for (const s of STORES) tx.objectStore(s).clear();
  });
}
