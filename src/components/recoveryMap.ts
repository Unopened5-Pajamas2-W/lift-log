/** Inline SVG front/back recovery heatmap. No image assets. */
import { BODY_BASE, MUSCLE_LABELS, MUSCLE_SHAPES } from "../data/muscles.ts";
import type { MuscleGroup } from "../lib/types.ts";
import { h } from "../lib/ui.ts";

/** Single source for recovery thresholds: figure fills, list bars, legend. */
export function statusFor(recovery: number): {
  color: string;
  label: "Fresh" | "Tired" | "Fatigued";
} {
  if (recovery >= 70) return { color: "#047857", label: "Fresh" };
  if (recovery >= 30) return { color: "#b45309", label: "Tired" };
  return { color: "#dc2626", label: "Fatigued" };
}

/** Back-compat alias (thresholds live in statusFor). */
export function colorFor(recovery: number): string {
  return statusFor(recovery).color;
}

function figure(
  side: "front" | "back",
  map: Record<MuscleGroup, number>,
): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 200");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${side} muscle recovery`);
  svg.setAttribute("class", "body-map");
  svg.style.width = "100%";
  const base = BODY_BASE.find((b) => b.side === side);
  if (base) {
    const b = document.createElementNS("http://www.w3.org/2000/svg", "path");
    b.setAttribute("d", base.path);
    b.setAttribute("fill", "#e5e7eb");
    b.setAttribute("stroke", "#9ca3af");
    b.setAttribute("stroke-width", "1");
    svg.appendChild(b);
  }
  for (const shape of MUSCLE_SHAPES.filter((s) => s.side === side)) {
    const v = map[shape.muscle] ?? 100;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", shape.path);
    p.setAttribute("fill", statusFor(v).color);
    p.setAttribute("fill-opacity", "0.88");
    p.setAttribute("stroke", "#ffffff");
    p.setAttribute("stroke-width", "1");
    p.setAttribute("stroke-linejoin", "round");
    const title = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title",
    );
    title.textContent = `${MUSCLE_LABELS[shape.muscle]}: ${v}%`;
    p.appendChild(title);
    svg.appendChild(p);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(shape.lx));
    t.setAttribute("y", String(shape.ly));
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.setAttribute("class", "body-map-label");
    t.textContent = `${v}`;
    svg.appendChild(t);
  }
  return svg;
}

function legend(): HTMLElement {
  const row = h("div", { class: "rec-legend", "aria-label": "Recovery legend" });
  for (const v of [100, 50, 10]) {
    const s = statusFor(v);
    const chip = h(
      "span",
      { class: "rec-legend-item" },
      h("i", { class: "rec-swatch" }),
      `${s.label}`,
    );
    (chip.firstChild as HTMLElement).style.background = s.color;
    row.appendChild(chip);
  }
  return row;
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
  wrap.appendChild(legend());
  const list = h("ul", { class: "recovery-list" });
  (Object.keys(map) as MuscleGroup[]).forEach((m) => {
    const v = map[m] ?? 100;
    const bar = h("span", { class: "bar" }, h("i", {}));
    (bar.firstChild as HTMLElement).style.width = `${v}%`;
    (bar.firstChild as HTMLElement).style.background = statusFor(v).color;
    const li = h(
      "li",
      { class: "rec-row" },
      h(
        "div",
        { class: "rec-row-top" },
        h("span", {}, `${MUSCLE_LABELS[m]} — ${v}%`),
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
