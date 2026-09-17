/** Backup serialization vectors: parse validation + CSV shape. */
import { describe, expect, it } from "vitest";
import { parseBackup, setsToCsv } from "../../src/lib/backup.ts";

describe("backup", () => {
  it("rejects non-backup files", () => {
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow();
  });

  it("counts rows per store", () => {
    const { counts } = parseBackup(
      JSON.stringify({
        app: "lift-log",
        schemaVersion: 1,
        exportedAt: 0,
        data: { workouts: [{ id: "a" }], sets: [] },
      }),
    );
    expect(counts).toEqual({ workouts: 1, sets: 0 });
  });

  it("emits one CSV row per set with header", () => {
    const csv = setsToCsv([
      {
        date: "2026-09-16",
        workout: "Push",
        exercise: "Bench",
        setNumber: 1,
        weightKg: 60,
        reps: 8,
        volume: 480,
        completed: true,
      },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "date,workout,exercise,set_number,weight_kg,reps,rpe,volume",
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("60,8");
  });
});
