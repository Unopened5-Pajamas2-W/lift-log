/** Unit vectors for recovery (spec §7). */
import { describe, expect, it } from "vitest";
import { recoveryForMuscle, recoveryMap } from "../../src/lib/recovery.ts";

const NOW = 1_800_000_000_000;

function chestInput(createdAt: number, weightKg = 100, reps = 10) {
  return {
    set: { weightKg, reps, completed: true, createdAt },
    exercise: { primaryMuscle: "chest" as const, secondaryMuscles: [] },
  };
}

describe("recovery", () => {
  it("single 10x100 chest set now recovers to ~92% (cap 12000)", () => {
    expect(recoveryForMuscle(1000, "chest")).toBe(92);
  });

  it("150-hour-old volume is fully recovered", () => {
    const map = recoveryMap([chestInput(NOW - 150 * 3_600_000)], {}, NOW);
    expect(map.chest).toBe(100);
  });

  it("recent volume lowers recovery", () => {
    const map = recoveryMap([chestInput(NOW)], {}, NOW);
    expect(map.chest).toBe(92);
    expect(map.back).toBe(100);
  });

  it("manual override sticks until cleared", () => {
    const map = recoveryMap([chestInput(NOW)], { chest: 50 }, NOW);
    expect(map.chest).toBe(50);
    const cleared = recoveryMap([chestInput(NOW)], { chest: null }, NOW);
    expect(cleared.chest).toBe(92);
  });
});
