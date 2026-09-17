/** Hand-drawn volume-over-time canvas chart (~60 lines, no chart lib). */
import { h } from "../lib/ui.ts";

export function renderVolumeChart(
  points: { t: number; volume: number }[],
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
  const series = [
    ...[...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([w, v]) => ({ t: w * 7 * 86_400_000, volume: v })),
    ...recent.sort((a, b) => a.t - b.t),
  ];
  const canvas = h("canvas", { class: "chart" }) as HTMLCanvasElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `Volume chart with ${series.length} points`,
  );
  wrap.appendChild(canvas);
  requestAnimationFrame(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 300;
    const hh = 180;
    canvas.width = w * dpr;
    canvas.height = hh * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const max = Math.max(...series.map((s) => s.volume), 1);
    const step = w / Math.max(1, series.length - 1);
    ctx.strokeStyle =
      getComputedStyle(document.body).getPropertyValue("--accent") || "#60a5fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((s, i) => {
      const x = series.length === 1 ? w / 2 : i * step;
      const y = hh - 12 - (s.volume / max) * (hh - 32);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    series.forEach((s, i) => {
      const x = series.length === 1 ? w / 2 : i * step;
      const y = hh - 12 - (s.volume / max) * (hh - 32);
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    });
  });
  return wrap;
}
