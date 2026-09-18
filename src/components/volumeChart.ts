/** Hand-drawn volume-over-time canvas chart (no chart lib).
 * Labeled axes: 3 y gridlines + start/end dates; weekly buckets dashed. */
import { displayWeight } from "../lib/units.ts";
import type { Units } from "../lib/types.ts";
import { fmtDate, h } from "../lib/ui.ts";

/** 3 nice round ticks: 0, mid, max (top always covers max). Pure. */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 2;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm > 5 ? 10 : norm > 2 ? 5 : norm > 1 ? 2 : 1) * mag;
  return [0, step, step * 2];
}

interface PlotPoint {
  t: number;
  volume: number;
  bucketed: boolean;
}

interface Geometry {
  padL: number;
  plotW: number;
  padT: number;
  plotH: number;
  max: number;
  w: number;
  hh: number;
}

function geometry(w: number, hh: number, max: number): Geometry {
  const padL = 44;
  const padB = 18;
  const padT = 8;
  return {
    padL,
    plotW: w - padL - 8,
    padT,
    plotH: hh - padT - padB,
    max,
    w,
    hh,
  };
}

function paintGrid(
  ctx: CanvasRenderingContext2D,
  g: Geometry,
  series: PlotPoint[],
  units: Units,
): void {
  const x = (i: number): number =>
    series.length === 1
      ? g.padL + g.plotW / 2
      : g.padL + (i / (series.length - 1)) * g.plotW;
  const y = (v: number): number => g.padT + g.plotH - (v / g.max) * g.plotH;
  ctx.font = "11px -apple-system, system-ui, sans-serif";
  ctx.lineWidth = 1;
  for (const tickKg of niceTicks(g.max)) {
    const ty = y(tickKg);
    ctx.beginPath();
    ctx.moveTo(g.padL, ty);
    ctx.lineTo(g.w - 8, ty);
    ctx.stroke();
    const label = Math.round(displayWeight(tickKg, units)).toLocaleString(
      "en-US",
    );
    ctx.fillText(label, 4, ty + 4);
  }
  const first = series[0];
  const last = series[series.length - 1];
  if (first !== undefined) ctx.fillText(fmtDate(first.t), g.padL, g.hh - 4);
  if (last !== undefined && series.length > 1) {
    const endLabel = fmtDate(last.t);
    ctx.fillText(endLabel, g.w - 8 - ctx.measureText(endLabel).width, g.hh - 4);
  }
  void x;
}

function paintRuns(
  ctx: CanvasRenderingContext2D,
  g: Geometry,
  series: PlotPoint[],
): void {
  const x = (i: number): number =>
    series.length === 1
      ? g.padL + g.plotW / 2
      : g.padL + (i / (series.length - 1)) * g.plotW;
  const y = (v: number): number => g.padT + g.plotH - (v / g.max) * g.plotH;
  const run = (idx: number[], dashed: boolean): void => {
    const head = idx[0];
    if (idx.length === 0 || head === undefined) return;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    idx.forEach((i, k) => {
      const pt = series[i];
      if (pt === undefined) return;
      if (k === 0) ctx.moveTo(x(i), y(pt.volume));
      else ctx.lineTo(x(i), y(pt.volume));
    });
    if (idx.length === 1) {
      const pt = series[head];
      if (pt !== undefined) {
        ctx.moveTo(x(head) - 4, y(pt.volume));
        ctx.lineTo(x(head) + 4, y(pt.volume));
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const bucketed = series
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.bucketed)
    .map(({ i }) => i);
  const fresh = series
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.bucketed)
    .map(({ i }) => i);
  if (bucketed.length > 0 && fresh.length > 0) {
    const bridge = fresh[0];
    if (bridge !== undefined) bucketed.push(bridge);
  }
  run(bucketed, true);
  run(fresh, false);
}

function paintDots(
  ctx: CanvasRenderingContext2D,
  g: Geometry,
  series: PlotPoint[],
): void {
  const x = (i: number): number =>
    series.length === 1
      ? g.padL + g.plotW / 2
      : g.padL + (i / (series.length - 1)) * g.plotW;
  const y = (v: number): number => g.padT + g.plotH - (v / g.max) * g.plotH;
  series.forEach((s, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(s.volume), s.bucketed ? 2 : 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function paintChart(
  canvas: HTMLCanvasElement,
  series: PlotPoint[],
  units: Units,
): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 300;
  const hh = 180;
  canvas.width = w * dpr;
  canvas.height = hh * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const css = getComputedStyle(document.body);
  const accent = css.getPropertyValue("--accent").trim() || "#1d4ed8";
  const border = css.getPropertyValue("--border").trim() || "#e5e7eb";
  const muted = css.getPropertyValue("--muted").trim() || "#5b6472";
  const g = geometry(w, hh, Math.max(...series.map((s) => s.volume), 1));
  ctx.strokeStyle = border;
  ctx.fillStyle = muted;
  paintGrid(ctx, g, series, units);
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 2;
  paintRuns(ctx, g, series);
  paintDots(ctx, g, series);
}

export function renderVolumeChart(
  points: { t: number; volume: number }[],
  units: Units = "kg",
): HTMLElement {
  const wrap = h("div", { class: "card" }, h("strong", {}, "Volume over time"));
  if (points.length === 0) {
    wrap.appendChild(
      h("p", { class: "muted" }, "Log a workout to see your volume trend."),
    );
    return wrap;
  }
  // Downsample past 90 days to weekly buckets.
  const cutoff = Date.now() - 90 * 86_400_000;
  const recent = points.filter((p) => p.t >= cutoff);
  const old = points.filter((p) => p.t < cutoff);
  const buckets = new Map<number, number>();
  for (const p of old) {
    const week = Math.floor(p.t / (7 * 86_400_000));
    buckets.set(week, (buckets.get(week) ?? 0) + p.volume);
  }
  const series: PlotPoint[] = [
    ...[...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([wk, v]) => ({ t: wk * 7 * 86_400_000, volume: v, bucketed: true })),
    ...recent.sort((a, b) => a.t - b.t).map((p) => ({ ...p, bucketed: false })),
  ];
  const first = series[0];
  const last = series[series.length - 1];
  if (first === undefined || last === undefined) {
    wrap.appendChild(
      h("p", { class: "muted" }, "Log a workout to see your volume trend."),
    );
    return wrap;
  }
  const peak = Math.round(displayWeight(
    Math.max(...series.map((s) => s.volume), 1),
    units,
  )).toLocaleString("en-US");
  const canvas = h("canvas", { class: "chart" }) as HTMLCanvasElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `Volume chart with ${series.length} points, ` +
      `${fmtDate(first.t)} to ${fmtDate(last.t)}, peak ${peak} ${units}`,
  );
  wrap.appendChild(canvas);
  const hasBuckets = series.some((s) => s.bucketed);
  wrap.appendChild(
    h(
      "p",
      { class: "chart-caption" },
      hasBuckets
        ? `Dashed = weekly totals older than 90 days · solid = recent workouts · ${units}`
        : `Volume per workout · ${units}`,
    ),
  );
  requestAnimationFrame(() => paintChart(canvas, series, units));
  return wrap;
}
