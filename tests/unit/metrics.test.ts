/** Unit vectors for metrics (spec §7). Run with `npm test`. */
import { describe, expect, it } from "vitest";
import {
  checkPRs,
  epley1RM,
  isPR,
  pct1rmForRpe,
  sessionBestE1RM,
  sessionVolume,
  setE1RM,
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

  it("excludes warmups from best e1RM and volume", () => {
    const sets = [
      { weightKg: 100, reps: 8, completed: true, isWarmup: true },
      { weightKg: 60, reps: 8, completed: true },
    ];
    expect(sessionBestE1RM(sets)).toBeCloseTo(60 * (1 + 8 / 30), 5);
    expect(sessionVolume(sets)).toBe(480);
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

describe("RPE-anchored e1RM (doc §2.3, §6.5)", () => {
  it("pct1rmForRpe follows the corpus anchors with half-step interpolation", () => {
    expect(pct1rmForRpe(7)).toBeCloseTo(0.9, 5);
    expect(pct1rmForRpe(7.5)).toBeCloseTo(0.91, 5);
    expect(pct1rmForRpe(8)).toBeCloseTo(0.92, 5);
    expect(pct1rmForRpe(8.5)).toBeCloseTo(0.935, 5);
    expect(pct1rmForRpe(9)).toBeCloseTo(0.95, 5);
    expect(pct1rmForRpe(9.5)).toBeCloseTo(0.97, 5);
    expect(pct1rmForRpe(10)).toBe(1);
    // Clamped outside the meaningful range.
    expect(pct1rmForRpe(5)).toBeCloseTo(0.9, 5);
    expect(pct1rmForRpe(11)).toBe(1);
  });

  it("single @ RPE 9 → e1RM = load / 0.95 (the doc's daily-1RM calculator)", () => {
    expect(setE1RM({ weightKg: 150, reps: 1, rpe: 9 })).toBeCloseTo(157.8947, 3);
    expect(setE1RM({ weightKg: 100, reps: 1, rpe: 8 })).toBeCloseTo(108.6957, 3);
  });

  it("single @ RPE 10 is the load itself; unlogged singles stay on Epley", () => {
    expect(setE1RM({ weightKg: 120, reps: 1, rpe: 10 })).toBeCloseTo(120, 5);
    expect(setE1RM({ weightKg: 100, reps: 1 })).toBeCloseTo(epley1RM(100, 1), 5);
  });

  it("session best mixes both paths through the one calculator", () => {
    const best = sessionBestE1RM([
      { weightKg: 100, reps: 1, rpe: 9, completed: true }, // 105.26
      { weightKg: 95, reps: 3, completed: true }, // Epley 104.5
    ]);
    expect(best).toBeCloseTo(100 / 0.95, 3);
  });
});
