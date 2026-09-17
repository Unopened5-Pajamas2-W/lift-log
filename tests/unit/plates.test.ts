/** Unit vectors for the plate calculator (spec §7 R9). */
import { describe, expect, it } from "vitest";
import { formatPlateLine, plateBreakdown } from "../../src/lib/plates.ts";
import { toKg } from "../../src/lib/units.ts";

describe("plateBreakdown", () => {
  it("60 kg on a 20 kg bar loads 20 per side, exact", () => {
    const b = plateBreakdown(60, 20, "kg");
    expect(b.perSide).toEqual([20]);
    expect(b.exact).toBe(true);
    expect(b.loadableDisplay).toBe(60);
    expect(b.remainderDisplay).toBe(0);
  });

  it("100 kg on a 20 kg bar loads 25+15 per side, exact", () => {
    const b = plateBreakdown(100, 20, "kg");
    expect(b.perSide).toEqual([25, 15]);
    expect(b.exact).toBe(true);
  });

  it("135 lb on a 20 kg bar loads 45 per side with an honest remainder", () => {
    const b = plateBreakdown(toKg(135, "lb"), 20, "lb");
    expect(b.barDisplay).toBe(44);
    expect(b.perSide).toEqual([45]);
    expect(b.exact).toBe(false);
    expect(b.loadableDisplay).toBe(134);
    expect(b.remainderDisplay).toBeCloseTo(0.5, 5);
  });

  it("bar weight alone is just the bar", () => {
    const b = plateBreakdown(20, 20, "kg");
    expect(b.perSide).toEqual([]);
    expect(b.exact).toBe(true);
  });

  it("below-bar totals load nothing", () => {
    const b = plateBreakdown(15, 20, "kg");
    expect(b.perSide).toEqual([]);
    expect(b.exact).toBe(false);
    expect(b.loadableDisplay).toBe(20);
  });
});

describe("formatPlateLine", () => {
  it("formats exact loads", () => {
    expect(formatPlateLine(plateBreakdown(60, 20, "kg"), "kg")).toBe(
      "Load 60 kg: bar + 20/side.",
    );
  });

  it("formats closest-loadable loads", () => {
    expect(
      formatPlateLine(plateBreakdown(toKg(135, "lb"), 20, "lb"), "lb"),
    ).toContain("closest to 135");
  });
});
