/** Inline SVG tab-bar icons. Hand-drawn, offline, currentColor.
 *
 * Single source for tab glyphs: 24×24 viewBox, 2px stroke, round caps.
 * Keeps the production bundle dependency-free and exactly six glyphs.
 */

export type TabIconName =
  | "today"
  | "workout"
  | "programs"
  | "moves"
  | "history"
  | "progress"
  | "settings";

const NS = "http://www.w3.org/2000/svg";

type Ray = [string, string, string, string];

const RAYS: Ray[] = [
  ["12", "2.5", "12", "5"],
  ["12", "19", "12", "21.5"],
  ["2.5", "12", "5", "12"],
  ["19", "12", "21.5", "12"],
  ["5.3", "5.3", "7", "7"],
  ["17", "17", "18.7", "18.7"],
  ["5.3", "18.7", "7", "17"],
  ["17", "7", "18.7", "5.3"],
];

const TEETH: Ray[] = [
  ["12", "5", "12", "2.2"],
  ["12", "19", "12", "21.8"],
  ["5", "12", "2.2", "12"],
  ["19", "12", "21.8", "12"],
  ["7.05", "7.05", "5.07", "5.07"],
  ["16.95", "16.95", "18.93", "18.93"],
  ["7.05", "16.95", "5.07", "18.93"],
  ["16.95", "7.05", "18.93", "5.07"],
];

function base(): SVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  return svg;
}

function el(
  svg: SVGElement,
  tag: string,
  attrs: Record<string, string>,
): void {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  svg.appendChild(n);
}

function spokes(svg: SVGElement, list: Ray[]): void {
  for (const [x1, y1, x2, y2] of list) el(svg, "line", { x1, y1, x2, y2 });
}

const ICON_DRAWERS: Record<TabIconName, (svg: SVGElement) => void> = {
  today: (svg) => {
    el(svg, "circle", { cx: "12", cy: "12", r: "4" });
    spokes(svg, RAYS);
  },
  workout: (svg) => {
    el(svg, "line", { x1: "7", y1: "12", x2: "17", y2: "12" });
    el(svg, "line", { x1: "7", y1: "7.5", x2: "7", y2: "16.5" });
    el(svg, "line", { x1: "17", y1: "7.5", x2: "17", y2: "16.5" });
    el(svg, "line", { x1: "4", y1: "9.5", x2: "4", y2: "14.5" });
    el(svg, "line", { x1: "20", y1: "9.5", x2: "20", y2: "14.5" });
  },
  moves: (svg) => {
    el(svg, "path", {
      d: "M5 5.5h9a3 3 0 0 1 3 3v10H8a3 3 0 0 1-3-3v-10z",
    });
    el(svg, "line", { x1: "9", y1: "10", x2: "14", y2: "10" });
    el(svg, "line", { x1: "9", y1: "13.5", x2: "14", y2: "13.5" });
  },
  programs: (svg) => {
    // Calendar/plan glyph: grid with one filled session day.
    el(svg, "rect", { x: "3.5", y: "5", width: "17", height: "15.5", rx: "2" });
    el(svg, "line", { x1: "3.5", y1: "9.5", x2: "20.5", y2: "9.5" });
    el(svg, "line", { x1: "8", y1: "3", x2: "8", y2: "6.5" });
    el(svg, "line", { x1: "16", y1: "3", x2: "16", y2: "6.5" });
    el(svg, "line", { x1: "8", y1: "13", x2: "10.5", y2: "13" });
    el(svg, "line", { x1: "13.5", y1: "13", x2: "16", y2: "13" });
    el(svg, "line", { x1: "8", y1: "16.5", x2: "10.5", y2: "16.5" });
  },
  history: (svg) => {
    el(svg, "circle", { cx: "12", cy: "12", r: "8.5" });
    el(svg, "line", { x1: "12", y1: "7.5", x2: "12", y2: "12" });
    el(svg, "line", { x1: "12", y1: "12", x2: "15.5", y2: "13.5" });
  },
  progress: (svg) => {
    el(svg, "line", { x1: "3.5", y1: "20.5", x2: "20.5", y2: "20.5" });
    el(svg, "path", { d: "M4 16l4.5-4.5 3 3L17 8l2.5 2.5" });
    el(svg, "circle", { cx: "19.5", cy: "8", r: "1.2" });
  },
  settings: (svg) => {
    el(svg, "circle", { cx: "12", cy: "12", r: "6.5" });
    spokes(svg, TEETH);
    el(svg, "circle", { cx: "12", cy: "12", r: "2.5" });
  },
};

/** Build the icon node for a tab. Pure DOM, no strings to sanitize. */
export function tabIcon(name: TabIconName): SVGElement {
  const svg = base();
  ICON_DRAWERS[name](svg);
  return svg;
}
