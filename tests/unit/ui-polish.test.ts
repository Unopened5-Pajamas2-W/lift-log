/** UI-polish pure helpers: shared thresholds, chart ticks, volume text. */
import { describe, expect, it } from "vitest";
import {
  FRESH_MIN,
  recoveryColor,
  statusFor,
  TIRED_MIN,
} from "../../src/components/recoveryMap.ts";
import { MUSCLE_GROUPS } from "../../src/data/muscles.ts";
import { MUSCLE_PATHS } from "../../src/data/bodyMap.generated.ts";
import type { MuscleGroup } from "../../src/lib/types.ts";
import { niceTicks } from "../../src/components/volumeChart.ts";
import { fmtVolume } from "../../src/lib/ui.ts";

describe("statusFor (single source for figure, bars, legend)", () => {
  it("maps >=70 to Fresh green, 30-69 to Tired amber, <30 to Fatigued red", () => {
    expect(statusFor(100)).toEqual({ color: "#047857", label: "Fresh" });
    expect(statusFor(70).label).toBe("Fresh");
    expect(statusFor(69).label).toBe("Tired");
    expect(statusFor(30).label).toBe("Tired");
    expect(statusFor(29)).toEqual({ color: "#dc2626", label: "Fatigued" });
  });
});

describe("recoveryColor (continuous ramp behind statusFor's anchors)", () => {
  it("returns the exact status anchors at bucket boundaries and clamps 0-100", () => {
    expect(recoveryColor(100)).toBe(statusFor(100).color);
    expect(recoveryColor(70)).toBe(statusFor(69).color);
    expect(recoveryColor(30)).toBe(statusFor(29).color);
    expect(recoveryColor(0)).toBe("#dc2626");
    expect(recoveryColor(150)).toBe(recoveryColor(100));
    expect(recoveryColor(-5)).toBe(recoveryColor(0));
  });

  it("interpolates monotonically with no jumps at the 30/70 thresholds", () => {
    for (const v of [45, 55, 80, 90]) {
      expect(recoveryColor(v)).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(recoveryColor(80)).toBe("#83a007");
    expect(recoveryColor(90)).toBe("#0c8c05");
    expect(recoveryColor(45)).toBe("#d03618");
    const channelOf = (hex: string): number[] =>
      [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const near = (a: string, b: string) => {
      const ca = channelOf(a);
      const cb = channelOf(b);
      expect(Math.max(...ca.map((x, i) => Math.abs(x - cb[i]!)))).toBeLessThanOrEqual(8);
    };
    near(recoveryColor(FRESH_MIN - 1), recoveryColor(FRESH_MIN));
    near(recoveryColor(TIRED_MIN - 1), recoveryColor(TIRED_MIN));
  });
});

describe("body map dataset integrity (vendored anatomy)", () => {
  it("covers every tracked muscle on its expected sides with non-empty paths", () => {
    const expectedSides: Partial<Record<MuscleGroup, ("front" | "back")[]>> = {
      chest: ["front"],
      core: ["front"],
      biceps: ["front"],
      triceps: ["front", "back"],
      shoulders: ["front", "back"],
      back: ["front", "back"],
      quads: ["front", "back"],
      hamstrings: ["back"],
      glutes: ["back"],
      calves: ["front", "back"],
    };
    for (const muscle of MUSCLE_GROUPS) {
      if (muscle === "fullbody") {
        expect(MUSCLE_PATHS.fullbody.front.left).toEqual([]);
        expect(MUSCLE_PATHS.fullbody.back.right).toEqual([]);
        continue;
      }
      for (const side of expectedSides[muscle] ?? []) {
        const hemis = MUSCLE_PATHS[muscle][side];
        expect(hemis.left.length + hemis.right.length).toBeGreaterThan(0);
        for (const d of [...hemis.left, ...hemis.right]) {
          expect(d.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("niceTicks", () => {
  it("returns 3 round ticks spanning 0..max", () => {
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(1000)).toEqual([0, 500, 1000]);
    const [a, b, c] = niceTicks(480);
    expect(a).toBe(0);
    expect(c).toBeGreaterThanOrEqual(480);
    expect(b).toBeGreaterThan(0);
  });
});

describe("fmtVolume", () => {
  it("formats kg and converts to lb with unit suffix", () => {
    expect(fmtVolume(480, "kg")).toBe("480 kg");
    expect(fmtVolume(100, "lb")).toBe("220 lb");
    expect(fmtVolume(12000, "kg")).toBe("12,000 kg");
  });
});
