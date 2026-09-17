/** Backup: full JSON dump/import (schema-migrated, UUID-dedupe) + per-set CSV export. */
import { dumpAll, restoreAll } from "./store.ts";
import { SCHEMA_VERSION } from "./types.ts";
import { sessionVolume } from "./metrics.ts";

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
  for (const [k, v] of Object.entries(parsed.data))
    counts[k] = Array.isArray(v) ? v.length : 0;
  return { backup: parsed, counts };
}

export async function importJson(
  json: string,
): Promise<Record<string, number>> {
  const { backup, counts } = parseBackup(json);
  await restoreAll(backup.data);
  return counts;
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
}

export function setsToCsv(
  rows: (CsvSetRow & { completed: boolean })[],
): string {
  const header = "date,workout,exercise,set_number,weight_kg,reps,rpe,volume";
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
