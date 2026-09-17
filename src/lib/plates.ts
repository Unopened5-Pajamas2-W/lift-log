/** Plate calculator: per-side breakdown from a fixed standard plate set. Pure, dependency-free. */
import type { Units } from "./types.ts";
import { displayWeight, toKg } from "./units.ts";

/** Standard plates per side, display units, largest-first. */
export const STANDARD_PLATES_LB = [45, 35, 25, 10, 5, 2.5];
export const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateBreakdown {
  /** Plates per side in display units, largest-first. Empty when total <= bar. */
  perSide: number[];
  barDisplay: number;
  requestedDisplay: number;
  /** Closest loadable total in display units (bar + 2× per-side sum). */
  loadableDisplay: number;
  exact: boolean;
  /** Unaccounted load per side in display units (0 when exact). */
  remainderDisplay: number;
}

/**
 * Greedy per-side plate breakdown. Math happens in display units so the
 * result matches the plates on the rack. Never rounds up: inexact totals
 * report the closest loadable weight at or below the request.
 */
export function plateBreakdown(
  totalKg: number,
  barKg: number,
  units: Units,
): PlateBreakdown {
  const barDisplay = displayWeight(Math.max(0, barKg), units);
  const requestedDisplay = displayWeight(Math.max(0, totalKg), units);
  const plates = units === "lb" ? STANDARD_PLATES_LB : STANDARD_PLATES_KG;
  const step = units === "lb" ? 0.5 : 0.25;
  const roundStep = (v: number): number => Math.round(v / step) * step;

  if (requestedDisplay <= barDisplay) {
    return {
      perSide: [],
      barDisplay,
      requestedDisplay,
      loadableDisplay: barDisplay,
      exact: requestedDisplay === barDisplay,
      remainderDisplay: 0,
    };
  }
  let side = roundStep((requestedDisplay - barDisplay) / 2);
  const perSide: number[] = [];
  for (const p of plates) {
    while (side + 1e-9 >= p) {
      perSide.push(p);
      side = roundStep(side - p);
    }
  }
  const loaded = perSide.reduce((sum, p) => sum + p, 0);
  const loadableDisplay = roundStep(barDisplay + 2 * loaded);
  return {
    perSide,
    barDisplay,
    requestedDisplay,
    loadableDisplay,
    exact: side < 1e-9,
    remainderDisplay: side,
  };
}

/** One-line plate label for an exercise card (plain text, unit-aware). */
export function formatPlateLine(b: PlateBreakdown, units: Units): string {
  const fmt = (v: number): string =>
    `${Number.isInteger(v) ? v.toString() : v.toFixed(v < 10 ? 2 : 1).replace(/0$/, "")}`;
  const plates =
    b.perSide.length > 0 ? `bar + ${b.perSide.map(fmt).join(" + ")}/side` : "just the bar";
  if (b.requestedDisplay < b.barDisplay)
    return `Load ${fmt(b.requestedDisplay)} ${units}: below bar weight (${fmt(b.barDisplay)} ${units}) — use dumbbells.`;
  if (b.exact) return `Load ${fmt(b.requestedDisplay)} ${units}: ${plates}.`;
  return `Load ${fmt(b.loadableDisplay)} ${units} (closest to ${fmt(b.requestedDisplay)}): ${plates}.`;
}

/** Parse a bar-weight input in display units back to canonical kg. */
export function barInputToKg(display: number, units: Units): number {
  return Math.round(toKg(display, units) * 4) / 4;
}
