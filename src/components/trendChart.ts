/**
 * uPlot trend chart for per-exercise e1RM/volume sessions (spec R2/R3).
 * The only module allowed to import uPlot; jsdom has no canvas, so unit
 * tests never load this file — all data shaping stays in analytics.ts.
 */
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { Units } from "../lib/types.ts";
import { displayWeight } from "../lib/units.ts";
import type { SessionPoint } from "../lib/analytics.ts";
import { h, onDetached } from "../lib/ui.ts";

const HEIGHT = 220;
const FALLBACK_WIDTH = 380;
const FONT = "11px -apple-system, system-ui, sans-serif";

export interface TrendChartHandle {
  element: HTMLElement;
  /** Re-render with a windowed subset of sessions (R3 range switching). */
  update: (points: SessionPoint[]) => void;
}

interface Palette {
  accent: string;
  muted: string;
  text: string;
  border: string;
}

/** Read app theme colors from CSS custom properties (R13; re-read here if a
 *  dark mode lands later). */
function chartPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string): string =>
    css.getPropertyValue(name).trim() || fallback;
  return {
    accent: v("--accent", "#1d4ed8"),
    muted: v("--muted", "#5b6472"),
    text: v("--text", "#111827"),
    border: v("--border", "#e5e7eb"),
  };
}

/** Aligned uPlot data: nulls mark gaps so spanGaps:false never draws
 *  misleading dips to zero (spec §6.6). Values converted to display units. */
function toAlignedData(
  points: SessionPoint[],
  units: Units,
): uPlot.AlignedData {
  const xs: number[] = [];
  const e1rm: (number | null)[] = [];
  const vol: (number | null)[] = [];
  for (const p of points) {
    xs.push(p.t);
    e1rm.push(p.bestE1rmKg > 0 ? displayWeight(p.bestE1rmKg, units) : null);
    vol.push(p.volumeKg > 0 ? displayWeight(p.volumeKg, units) : null);
  }
  return [xs, e1rm, vol];
}

/** Human-readable cursor value for a series sample. */
function sampleValue(v: number | null | undefined, units: Units): string {
  if (v == null) return "—";
  return `${Math.round(v * 10) / 10} ${units}`;
}

/** Whole-number tick formatter for both y-axes. */
function wholeTicks(_u: uPlot, ticks: number[]): string[] {
  return ticks.map((t) => `${Math.round(t)}`);
}

/** X axis + left e1RM axis + right volume axis styling (R13 palette). */
function chartAxes(palette: Palette): uPlot.Options["axes"] {
  return [
    {
      stroke: palette.text,
      grid: { stroke: palette.border },
      ticks: { stroke: palette.border },
      font: FONT,
    },
    {
      stroke: palette.text,
      grid: { stroke: palette.border },
      font: FONT,
      values: wholeTicks,
    },
    {
      side: 1,
      scale: "vol",
      stroke: palette.text,
      grid: { show: false },
      font: FONT,
      values: wholeTicks,
    },
  ];
}

/** Series configs: x (timestamps), e1RM area line, dashed volume line. */
function chartSeries(
  units: Units,
  palette: Palette,
): uPlot.Options["series"] {
  const label = (name: string): string => `${name} (${units})`;
  const cursorValue = (_u: uPlot, v: number | null | undefined): string =>
    sampleValue(v, units);
  return [
    {},
    {
      label: label("Best e1RM"),
      stroke: palette.accent,
      width: 2,
      fill: `${palette.accent}1f`,
      value: cursorValue,
    },
    {
      label: label("Volume"),
      stroke: palette.muted,
      width: 1.5,
      dash: [5, 3],
      scale: "vol",
      value: cursorValue,
    },
  ];
}

/** Build the interactive chart inside `host` (axes, legend toggles, touch
 *  cursor) and return the instance. Caller owns resize/teardown wiring. */
function createChart(
  host: HTMLElement,
  points: SessionPoint[],
  units: Units,
  palette: Palette,
): uPlot {
  return new uPlot(
    {
      // SessionPoint.t is epoch ms; uPlot defaults to epoch seconds.
      ms: 1,
      width: host.clientWidth || FALLBACK_WIDTH,
      height: HEIGHT,
      scales: { x: { time: true } },
      series: chartSeries(units, palette),
      axes: chartAxes(palette),
      legend: { show: true, live: true },
    },
    toAlignedData(points, units),
    host,
  );
}

/** Visually-hidden chart summary for screen readers (R12). */
function summaryText(points: SessionPoint[], units: Units): string {
  if (points.length === 0) return "No sessions to chart yet.";
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "No sessions to chart yet.";
  const bests = points
    .map((p) => p.bestE1rmKg)
    .filter((v) => v > 0)
    .map((v) => displayWeight(v, units));
  const best = bests.length ? Math.max(...bests) : 0;
  const range =
    points.length === 1
      ? "1 session"
      : `${points.length} sessions, ${new Date(first.t).toLocaleDateString()} to ${new Date(last.t).toLocaleDateString()}`;
  return `${range}. Best e1RM ${Math.round(best * 10) / 10} ${units}.`;
}

/** Render the trend chart handle: sr-only summary + uPlot host with resize
 *  observation and destroy-on-detach (spec §4.2). */
export function renderTrendChart(
  points: SessionPoint[],
  units: Units,
): TrendChartHandle {
  const palette = chartPalette();
  const summary = h("p", { class: "sr-only" }, summaryText(points, units));
  const host = h("div", { class: "trend-host" });
  const element = h("div", { class: "trend-chart" }, summary, host);
  const chart = createChart(host, points, units, palette);
  const ro = new ResizeObserver(() => {
    const width = host.clientWidth;
    if (width > 0) chart.setSize({ width, height: HEIGHT });
  });
  ro.observe(host);
  onDetached(element, () => {
    ro.disconnect();
    chart.destroy();
  });
  return {
    element,
    update(next: SessionPoint[]): void {
      chart.setData(toAlignedData(next, units));
      summary.textContent = summaryText(next, units);
    },
  };
}
