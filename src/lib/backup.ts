/** Backup: full JSON dump/import (schema-migrated, UUID-dedupe) + per-set CSV export. */
import { dumpAll, restoreAll } from "./store.ts";
import type { STORES } from "./store.ts";
import { SCHEMA_VERSION } from "./types.ts";
import { sessionVolume } from "./metrics.ts";

export type StoreName = (typeof STORES)[number];

/** A validated row: known-good id, everything else passed through untouched. */
export interface ValidRow {
  id: string;
  updatedAt?: unknown;
  [key: string]: unknown;
}

export interface RestoreCounts {
  inserted: number;
  updated: number;
  skipped: number;
  invalid: number;
}

export type RestoreResult = Record<StoreName, RestoreCounts> & {
  unknownStores: string[];
};

/** Rejected before any write: keeps restores fast and OOM-free on iPhones. */
export const MAX_BACKUP_CHARS = 20_000_000; // ~20 MB JSON text
export const MAX_BACKUP_ROWS = 50_000;

export interface BackupFile {
  app: "lift-log";
  schemaVersion: number;
  exportedAt: number;
  data: Record<string, unknown[]>;
}

export async function exportJson(): Promise<BackupFile> {
  return {
    app: "lift-log",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    data: await dumpAll(),
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup);
}

export function parseBackup(json: string): {
  backup: BackupFile;
  counts: Record<string, number>;
} {
  if (json.length > MAX_BACKUP_CHARS) {
    throw new Error(
      `Backup too large (limit ~${MAX_BACKUP_CHARS / 1_000_000} MB).`,
    );
  }
  const parsed = JSON.parse(json) as BackupFile;
  if (
    parsed.app !== "lift-log" ||
    typeof parsed.data !== "object" ||
    parsed.data === null
  ) {
    throw new Error("Not a Lift Log backup file.");
  }
  // Forward-migration hook: v1 is current; unknown future versions pass through,
  // unknown fields are preserved by restoreAll's merge-by-id.
  if (typeof parsed.schemaVersion !== "number")
    parsed.schemaVersion = SCHEMA_VERSION;
  const counts: Record<string, number> = {};
  let total = 0;
  for (const [k, v] of Object.entries(parsed.data)) {
    const n = Array.isArray(v) ? v.length : 0;
    counts[k] = n;
    total += n;
  }
  if (total > MAX_BACKUP_ROWS) {
    throw new Error(
      `Backup has too many rows (${total}; limit ${MAX_BACKUP_ROWS}).`,
    );
  }
  return { backup: parsed, counts };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Minimal per-store shape checks; unknown fields always pass through. */
const ROW_VALIDATORS: Record<
  string,
  (row: Record<string, unknown>) => boolean
> = {
  exercises: (r) =>
    isNonEmptyString(r.name) &&
    isNonEmptyString(r.primaryMuscle) &&
    isNonEmptyString(r.equipment),
  workouts: (r) =>
    isNonEmptyString(r.title) &&
    isFiniteNumber(r.startedAt) &&
    (r.status === "active" ||
      r.status === "completed" ||
      r.status === "discarded"),
  sets: (r) =>
    isNonEmptyString(r.workoutId) &&
    isNonEmptyString(r.exerciseId) &&
    isFiniteNumber(r.weightKg) &&
    isFiniteNumber(r.reps) &&
    typeof r.completed === "boolean" &&
    isFiniteNumber(r.order) &&
    isFiniteNumber(r.createdAt),
  templates: (r) => isNonEmptyString(r.name) && Array.isArray(r.items),
  settings: (r) => r.id === "app",
  meta: () => true,
};

/**
 * Pure row validation (no IDB): splits raw dump data into writable rows
 * plus per-store invalid counts and unknown store names. Never throws
 * on bad rows — callers write only `valid`.
 */
export function validateRestore(data: Record<string, unknown[]>): {
  valid: Partial<Record<StoreName, ValidRow[]>>;
  invalid: Record<string, number>;
  unknownStores: string[];
} {
  const valid: Partial<Record<StoreName, ValidRow[]>> = {};
  const invalid: Record<string, number> = {};
  const unknownStores: string[] = [];
  for (const [store, rows] of Object.entries(data)) {
    const check = ROW_VALIDATORS[store];
    if (!check || !Array.isArray(rows)) {
      if (Array.isArray(rows)) unknownStores.push(store);
      continue;
    }
    const good: ValidRow[] = [];
    let bad = 0;
    for (const row of rows) {
      if (isRecord(row) && isNonEmptyString(row.id) && check(row)) {
        good.push({ ...row, id: row.id });
      } else {
        bad += 1;
      }
    }
    if (good.length > 0) valid[store as StoreName] = good;
    if (bad > 0) invalid[store] = bad;
  }
  return { valid, invalid, unknownStores };
}

export async function importJson(json: string): Promise<RestoreResult> {
  const { backup } = parseBackup(json);
  return restoreAll(backup.data);
}

interface CsvSetRow {
  date: string;
  workout: string;
  exercise: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  volume: number;
  isWarmup?: boolean;
}

export function setsToCsv(
  rows: (CsvSetRow & { completed: boolean })[],
): string {
  const header =
    "date,workout,exercise,set_number,weight_kg,reps,rpe,volume,is_warmup";
  const esc = (v: string | number | undefined): string => {
    if (v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.date,
      r.workout,
      r.exercise,
      r.setNumber,
      r.weightKg,
      r.reps,
      r.rpe ?? "",
      r.volume,
      r.isWarmup === true ? 1 : 0,
    ]
      .map(esc)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

export function csvVolume(weightKg: number, reps: number): number {
  return sessionVolume([{ weightKg, reps, completed: true }]);
}

/** Share a file via Web Share API, falling back to download. */
export async function shareOrDownload(
  filename: string,
  content: string,
  mime: string,
): Promise<void> {
  const blob = new Blob([content], { type: mime });
  const file = new File([blob], filename, { type: mime });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch {
    /* fall through to download */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
