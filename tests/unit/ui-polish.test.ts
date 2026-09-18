/** UI-polish pure helpers: shared thresholds, chart ticks, volume text. */
import { describe, expect, it } from "vitest";
import { statusFor } from "../../src/components/recoveryMap.ts";
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
