/** Inline SVG front/back recovery heatmap. No image assets. */
import { MUSCLE_LABELS, MUSCLE_SHAPES } from "../data/muscles.ts";
import type { MuscleGroup } from "../lib/types.ts";
import { h } from "../lib/ui.ts";

function colorFor(recovery: number): string {
  if (recovery >= 70) return "#34d399";
  if (recovery >= 30) return "#fbbf24";
  return "#f87171";
}

function figure(
  side: "front" | "back",
  map: Record<MuscleGroup, number>,
): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 200");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${side} muscle recovery`);
  svg.style.width = "100%";
  const body = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "ellipse",
  );
  body.setAttribute("cx", "50");
  body.setAttribute("cy", "105");
  body.setAttribute("rx", "30");
  body.setAttribute("ry", "90");
  body.setAttribute("fill", "none");
  body.setAttribute("stroke", "currentColor");
  body.setAttribute("opacity", "0.4");
  svg.appendChild(body);
  for (const shape of MUSCLE_SHAPES.filter((s) => s.side === side)) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", shape.path);
    p.setAttribute("fill", colorFor(map[shape.muscle] ?? 100));
    p.setAttribute("opacity", "0.9");
    const title = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title",
    );
    title.textContent = `${MUSCLE_LABELS[shape.muscle]}: ${map[shape.muscle] ?? 100}%`;
    p.appendChild(title);
    svg.appendChild(p);
  }
  return svg;
}

/** Render heatmap + per-muscle % list with manual override steppers. */
export function renderRecoveryMap(
  map: Record<MuscleGroup, number>,
  onOverride: (muscle: MuscleGroup, value: number | null) => void,
): HTMLElement {
  const wrap = h("div", {});
  const grid = h("div", { class: "heatmap" });
  const front = h(
    "div",
    {},
    h("div", { class: "muted" }, "Front"),
    figure("front", map),
  );
  const back = h(
    "div",
    {},
    h("div", { class: "muted" }, "Back"),
    figure("back", map),
  );
  grid.append(front, back);
  wrap.appendChild(grid);
  const list = h("ul", { class: "recovery-list" });
  (Object.keys(map) as MuscleGroup[]).forEach((m) => {
    const v = map[m] ?? 100;
    const bar = h("span", { class: "bar" }, h("i", {}));
    (bar.firstChild as HTMLElement).style.width = `${v}%`;
    (bar.firstChild as HTMLElement).style.background = colorFor(v);
    const li = h(
      "li",
      {},
      h("span", {}, `${MUSCLE_LABELS[m]} — ${v}%`),
      bar,
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
    );
    list.appendChild(li);
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
  return wrap;
}
