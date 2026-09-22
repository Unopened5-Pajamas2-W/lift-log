// @vitest-environment jsdom
/** Recovery map DOM wiring: figure structure + region↔row tap sync (R4/R5). */
import { afterEach, describe, expect, it } from "vitest";
import { renderRecoveryMap } from "../../src/components/recoveryMap.ts";
import { MUSCLE_GROUPS } from "../../src/data/muscles.ts";
import type { MuscleGroup } from "../../src/lib/types.ts";

function fullMap(value: number): Record<MuscleGroup, number> {
  return Object.fromEntries(
    MUSCLE_GROUPS.map((m) => [m, value]),
  ) as Record<MuscleGroup, number>;
}

afterEach(() => document.body.replaceChildren());

describe("renderRecoveryMap structure", () => {
  it("renders two figures, one region per mapped muscle side, empty badge layer", () => {
    const wrap = renderRecoveryMap(fullMap(100), () => {});
    expect(wrap.querySelectorAll("svg.body-map")).toHaveLength(2);
    const regions = wrap.querySelectorAll("g.body-region");
    expect(regions).toHaveLength(15);
    for (const g of regions) {
      expect(g.getAttribute("fill")).toBe("#047857");
      expect(g.querySelector("title")?.textContent).toMatch(/: 100%$/);
    }
    expect(wrap.querySelectorAll("g.body-hemi")).toHaveLength(30);
    expect(wrap.querySelectorAll("g.body-badge")).toHaveLength(0);
    expect(wrap.querySelectorAll("path.body-outline")).toHaveLength(2);
    expect(wrap.querySelectorAll("path.body-neutral").length).toBeGreaterThan(0);
  });

  it("keeps the recovery list ordered with steppers and bars", () => {
    const wrap = renderRecoveryMap(fullMap(100), () => {});
    const rows = wrap.querySelectorAll("li.rec-row");
    expect(rows).toHaveLength(MUSCLE_GROUPS.length);
    expect(rows[0]!.querySelector(".rec-label")?.textContent).toContain(
      "Chest — 100%",
    );
    expect(rows[0]!.querySelectorAll(".rec-steppers button")).toHaveLength(2);
  });
});

describe("figure ↔ list tap sync", () => {
  it("tapping a figure region highlights its row; tapping again clears", () => {
    const wrap = renderRecoveryMap(fullMap(100), () => {});
    document.body.appendChild(wrap);
    const chestRegion = wrap.querySelector<SVGGElement>(
      'g[data-muscle="chest"]',
    )!;
    chestRegion.dispatchEvent(new Event("click"));
    expect(chestRegion.classList.contains("is-selected")).toBe(true);
    const chestRow = wrap.querySelectorAll("li.rec-row")[0]!;
    expect(chestRow.classList.contains("is-selected")).toBe(true);
    chestRegion.dispatchEvent(new Event("click"));
    expect(chestRegion.classList.contains("is-selected")).toBe(false);
    expect(chestRow.classList.contains("is-selected")).toBe(false);
  });

  it("tapping a list label highlights both figure regions of that muscle", () => {
    const wrap = renderRecoveryMap(fullMap(100), () => {});
    document.body.appendChild(wrap);
    const shouldersRow = Array.from(
      wrap.querySelectorAll("li.rec-row"),
    ).find((row) => row.querySelector(".rec-label")?.textContent?.startsWith("Shoulders"))!;
    shouldersRow.querySelector(".rec-label")!.dispatchEvent(new Event("click"));
    const shoulderRegions = wrap.querySelectorAll(
      'g[data-muscle="shoulders"]',
    );
    expect(shoulderRegions).toHaveLength(2);
    for (const g of shoulderRegions) {
      expect(g.classList.contains("is-selected")).toBe(true);
    }
  });
});
