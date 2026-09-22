/** Inline SVG front/back recovery heatmap: vendored anatomical figure,
 *  continuous recovery color ramp, gradient legend, and tap-sync between
 *  figure regions and the recovery list. No image assets, no runtime fetch. */
import {
  BODY_NEUTRAL,
  BODY_OUTLINE,
  BODY_VIEWBOX,
  MUSCLE_PATHS,
} from "../data/bodyMap.generated.ts";
import type { BodySide } from "../data/bodyMap.generated.ts";
import { MUSCLE_LABELS } from "../data/muscles.ts";
import type { MuscleGroup } from "../lib/types.ts";
import { h } from "../lib/ui.ts";

/** Recovery thresholds, single source for status buckets, color ramp,
 *  legend stops, figure fills, and list bars. */
export const TIRED_MIN = 30;
export const FRESH_MIN = 70;
const FRESH = "#047857";
const TIRED = "#b45309";
const FATIGUED = "#dc2626";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Single source for recovery status: figure titles, list rows, legend. */
export function statusFor(recovery: number): {
  color: string;
  label: "Fresh" | "Tired" | "Fatigued";
} {
  if (recovery >= FRESH_MIN) return { color: FRESH, label: "Fresh" };
  if (recovery >= TIRED_MIN) return { color: TIRED, label: "Tired" };
  return { color: FATIGUED, label: "Fatigued" };
}

function rgbOf(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function hslOf(hex: string): [number, number, number] {
  const [r, g, b] = rgbOf(hex).map((x) => x / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation =
    delta === 0 ? 0 : (delta / (1 - Math.abs(2 * lightness - 1))) * 100;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return [hue, saturation, lightness * 100];
}

function hexOf(hsl: [number, number, number]): string {
  const [hue, sat, light] = hsl;
  const chroma = ((1 - Math.abs((2 * light) / 100 - 1)) * sat) / 100;
  const sector = hue / 60;
  const secondary = chroma * (1 - Math.abs((sector % 2) - 1));
  const [r, g, b] =
    sector < 1
      ? [chroma, secondary, 0]
      : sector < 2
        ? [secondary, chroma, 0]
        : sector < 3
          ? [0, chroma, secondary]
          : sector < 4
            ? [0, secondary, chroma]
            : sector < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const offset = light / 100 - chroma / 2;
  return `#${[r, g, b]
    .map((x) =>
      Math.round((x + offset) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function mixHsl(from: string, to: string, t: number): string {
  const a = hslOf(from);
  const b = hslOf(to);
  let dh = b[0] - a[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return hexOf([
    (a[0] + dh * t + 360) % 360,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]);
}

/** Continuous fresh→tired→fatigued ramp sharing statusFor's anchors and
 *  thresholds: piecewise HSL interpolation between the three status colors
 *  (clamped to 0–100). */
export function recoveryColor(recovery: number): string {
  const v = Math.min(100, Math.max(0, recovery));
  if (v >= FRESH_MIN)
    return mixHsl(TIRED, FRESH, (v - FRESH_MIN) / (100 - FRESH_MIN));
  if (v >= TIRED_MIN)
    return mixHsl(FATIGUED, TIRED, (v - TIRED_MIN) / (FRESH_MIN - TIRED_MIN));
  return FATIGUED;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

const REGION_ENTRIES = Object.entries(MUSCLE_PATHS) as [
  MuscleGroup,
  Record<BodySide, Record<"left" | "right", string[]>>,
][];

/** Render one side's figure: neutral silhouette parts, colored muscle
 *  region groups (tap to select), contour outline, and the % badge layer
 *  (badges are placed after mount via getBBox, skipped where unavailable). */
function figure(
  side: BodySide,
  map: Record<MuscleGroup, number>,
  selected: () => MuscleGroup | null,
  onSelect: (muscle: MuscleGroup | null) => void,
  regions: Map<MuscleGroup, SVGGElement[]>,
): SVGElement {
  const svg = svgEl("svg", {
    viewBox: BODY_VIEWBOX[side],
    class: "body-map",
    role: "img",
    "aria-label": `${side} muscle recovery`,
    "data-side": side,
  });
  for (const d of BODY_NEUTRAL[side]) {
    svg.appendChild(svgEl("path", { d, class: "body-neutral" }));
  }
  for (const [muscle, sides] of REGION_ENTRIES) {
    const sidePaths = sides[side];
    if (sidePaths.left.length + sidePaths.right.length === 0) continue;
    const value = map[muscle] ?? 100;
    const g = svgEl("g", { class: "body-region", fill: recoveryColor(value) });
    g.dataset.muscle = muscle;
    for (const hemi of ["left", "right"] as const) {
      const paths = sidePaths[hemi];
      if (paths.length === 0) continue;
      const hemiGroup = svgEl("g", { class: "body-hemi" });
      for (const d of paths) {
        hemiGroup.appendChild(
          svgEl("path", {
            d,
            class: "body-region-shape",
            "vector-effect": "non-scaling-stroke",
          }),
        );
      }
      g.appendChild(hemiGroup);
    }
    const title = svgEl("title");
    title.textContent = `${MUSCLE_LABELS[muscle]}: ${value}%`;
    g.appendChild(title);
    g.addEventListener("click", () =>
      onSelect(selected() === muscle ? null : muscle),
    );
    const group = regions.get(muscle) ?? [];
    group.push(g);
    regions.set(muscle, group);
    svg.appendChild(g);
  }
  svg.appendChild(
    svgEl("path", {
      d: BODY_OUTLINE[side],
      class: "body-outline",
      "vector-effect": "non-scaling-stroke",
    }),
  );
  svg.appendChild(svgEl("g", { class: "body-badges" }));
  return svg;
}

/** Place one % badge chip per region at the region's bbox center (one
 *  rAF-based pass after mount; cosmetic only, no-op without getBBox). */
function placeBadges(
  wrap: HTMLElement,
  map: Record<MuscleGroup, number>,
  attempt = 0,
): void {
  if (!wrap.isConnected) {
    if (attempt < 20) requestAnimationFrame(() => placeBadges(wrap, map, attempt + 1));
    return;
  }
  for (const svg of wrap.querySelectorAll<SVGSVGElement>("svg.body-map")) {
    const badgeLayer = svg.querySelector("g.body-badges");
    if (!badgeLayer) return;
    if (typeof svg.getBBox !== "function") return;
    for (const region of svg.querySelectorAll<SVGGElement>("g.body-region")) {
      const muscle = region.dataset.muscle as MuscleGroup | undefined;
      if (!muscle) continue;
      const hemiBoxes = Array.from(
        region.querySelectorAll("g.body-hemi"),
      ).map((hemi) => (hemi as SVGGElement).getBBox());
      if (hemiBoxes.length === 0) continue;
      const box = hemiBoxes.reduce((best, b) =>
        b.width * b.height > best.width * best.height ? b : best,
      );
      const badge = svgEl("g", {
        class: "body-badge",
        transform: `translate(${box.x + box.width / 2} ${box.y + box.height / 2})`,
      });
      const text = svgEl("text", {
        "text-anchor": "middle",
        "dominant-baseline": "central",
      });
      text.textContent = String(map[muscle] ?? 100);
      badge.appendChild(text);
      badgeLayer.appendChild(badge);
      if (typeof text.getBBox === "function") {
        const extent = text.getBBox();
        const padX = 12;
        const padY = 6;
        const rect = svgEl("rect", {
          x: String(extent.x - padX),
          y: String(extent.y - padY),
          width: String(extent.width + padX * 2),
          height: String(extent.height + padY * 2),
          rx: String((extent.height + padY * 2) / 2),
        });
        badge.insertBefore(rect, text);
      }
    }
  }
}

/** Gradient legend bar: sampled from recoveryColor so the legend matches
 *  the figure and list exactly. */
function legend(): HTMLElement {
  const sampled = Array.from(
    { length: 21 },
    (_, i) => `${recoveryColor(i * 5)} ${i * 5}%`,
  );
  const bar = h("div", { class: "rec-legend-bar" });
  bar.style.background = `linear-gradient(90deg, ${sampled.join(", ")})`;
  for (const threshold of [TIRED_MIN, FRESH_MIN]) {
    const tick = h("i", { class: "rec-legend-tick" });
    tick.style.left = `${threshold}%`;
    bar.appendChild(tick);
  }
  const centers: [string, number][] = [
    ["Fatigued", TIRED_MIN / 2],
    ["Tired", (TIRED_MIN + FRESH_MIN) / 2],
    ["Fresh", (FRESH_MIN + 100) / 2],
  ];
  const labels = h("div", { class: "rec-legend-labels" });
  for (const [label, center] of centers) {
    const span = h("span", {}, label);
    span.style.left = `${center}%`;
    labels.appendChild(span);
  }
  return h(
    "div",
    { class: "rec-legend", "aria-label": "Recovery legend" },
    bar,
    labels,
  );
}

/** Render heatmap + per-muscle % list with manual override steppers.
 *  Tapping a figure region highlights (and scrolls to) its list row and
 *  vice versa; tapping the active region or row again clears selection. */
export function renderRecoveryMap(
  map: Record<MuscleGroup, number>,
  onOverride: (muscle: MuscleGroup, value: number | null) => void,
): HTMLElement {
  const wrap = h("div", {});
  const state = { muscle: null as MuscleGroup | null };
  const regions = new Map<MuscleGroup, SVGGElement[]>();
  const rowByMuscle = new Map<MuscleGroup, HTMLElement>();

  const select = (muscle: MuscleGroup | null) => {
    state.muscle = muscle;
    for (const [m, groups] of regions) {
      for (const g of groups) g.classList.toggle("is-selected", m === muscle);
    }
    for (const [m, row] of rowByMuscle) {
      row.classList.toggle("is-selected", m === muscle);
    }
    if (muscle) rowByMuscle.get(muscle)?.scrollIntoView?.({ block: "nearest" });
  };

  const grid = h("div", { class: "heatmap" });
  for (const side of ["front", "back"] as BodySide[]) {
    grid.append(
      h(
        "div",
        { class: "heatmap-col" },
        h("div", { class: "heatmap-caption" }, side === "front" ? "Front" : "Back"),
        figure(side, map, () => state.muscle, select, regions),
      ),
    );
  }
  wrap.appendChild(grid);
  wrap.appendChild(legend());

  const list = h("ul", { class: "recovery-list" });
  (Object.keys(map) as MuscleGroup[]).forEach((m) => {
    const v = map[m] ?? 100;
    const label = h("span", { class: "rec-label" }, `${MUSCLE_LABELS[m]} — ${v}%`);
    label.addEventListener("click", () => select(state.muscle === m ? null : m));
    const bar = h("span", { class: "bar" }, h("i", {}));
    (bar.firstChild as HTMLElement).style.width = `${v}%`;
    (bar.firstChild as HTMLElement).style.background = recoveryColor(v);
    const row = h(
      "li",
      { class: "rec-row" },
      h(
        "div",
        { class: "rec-row-top" },
        label,
        h(
          "span",
          { class: "rec-steppers" },
          h(
            "button",
            {
              "aria-label": `Lower ${MUSCLE_LABELS[m]} recovery by 10`,
              onclick: () => onOverride(m, v - 10),
            },
            "−",
          ),
          h(
            "button",
            {
              "aria-label": `Raise ${MUSCLE_LABELS[m]} recovery by 10`,
              onclick: () => onOverride(m, v + 10),
            },
            "+",
          ),
        ),
      ),
      bar,
    );
    rowByMuscle.set(m, row);
    list.appendChild(row);
  });
  const reset = h(
    "button",
    {
      onclick: () =>
        (Object.keys(map) as MuscleGroup[]).forEach((m) => onOverride(m, null)),
    },
    "Clear overrides",
  );
  wrap.append(list, h("div", { class: "row" }, reset));
  requestAnimationFrame(() => placeBadges(wrap, map));
  return wrap;
}
