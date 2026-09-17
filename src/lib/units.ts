/** Unit conversion. Canonical storage is kg; display converts. */
import type { Units } from "./types.ts";

export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 2.20462;

/** Display weight in the given units, rounded to plate-friendly steps. */
export function displayWeight(weightKg: number, units: Units): number {
  if (units === "kg") return Math.round(weightKg / 0.25) * 0.25;
  return Math.round(weightKg * LB_PER_KG * 2) / 2;
}

/** Parse a display weight back to canonical kg. */
export function toKg(display: number, units: Units): number {
  return units === "kg" ? display : display * KG_PER_LB;
}

export function formatWeight(weightKg: number, units: Units): string {
  const d = displayWeight(weightKg, units);
  return `${Number.isInteger(d) ? d.toString() : d.toFixed(d < 10 ? 2 : 1).replace(/0$/, "")} ${units}`;
}

/** Overload increments in kg (upper 2.5 lb ≈ 1.25 kg, lower 5 lb ≈ 2.5 kg). */
export function overloadIncrementKg(
  isLowerBody: boolean,
  units: Units,
): number {
  if (units === "lb") return isLowerBody ? toKg(5, "lb") : toKg(2.5, "lb");
  return isLowerBody ? 2.5 : 1.25;
}
