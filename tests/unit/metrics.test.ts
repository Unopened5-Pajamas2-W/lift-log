/** Unit vectors for metrics (spec §7). Run with `npm test`. */
import { describe, expect, it } from "vitest";
import {
  checkPRs,
  epley1RM,
  isPR,
  sessionBestE1RM,
  sessionVolume,
  setVolume,
} from "../../src/lib/metrics.ts";

describe("metrics", () => {
  it("computes Epley e1RM", () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.67, 1);
    expect(epley1RM(0, 5)).toBe(0);
    expect(epley1RM(60, 0)).toBe(0);
  });

  it("computes set volume", () => {
    expect(setVolume({ weightKg: 60, reps: 8 })).toBe(480);
    expect(setVolume({ weightKg: 0, reps: 8 })).toBe(0);
  });

  it("takes session best across completed sets only", () => {
    const best = sessionBestE1RM([
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 100, reps: 1, completed: false },
    ]);
    expect(best).toBeCloseTo(60 * (1 + 8 / 30), 5);
  });

  it("sums session volume for completed sets", () => {
    expect(
      sessionVolume([
        { weightKg: 60, reps: 8, completed: true },
        { weightKg: 60, reps: 8, completed: false },
      ]),
    ).toBe(480);
  });

  it("detects PRs and ignores float noise", () => {
    expect(isPR(115, 110)).toBe(true);
    expect(isPR(110.0005, 110)).toBe(false);
    expect(isPR(50, 0)).toBe(true); // first log
    expect(isPR(0, 0)).toBe(false);
  });

  it("bench 60x8 then 62.5x8 flags an e1RM PR", () => {
    const prev = epley1RM(60, 8);
    const next = epley1RM(62.5, 8);
    expect(checkPRs(next, 500, prev, 480).e1rmPR).toBe(true);
  });
});
