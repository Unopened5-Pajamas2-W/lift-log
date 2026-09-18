/** Tiny DOM + UX helpers. No dependencies. */
import { LB_PER_KG } from "./units.ts";
import type { Units } from "./types.ts";

/** Create an element with attrs/children in one call. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<
    string,
    string | number | boolean | ((e: Event) => void) | null | undefined
  > = {},
  ...children: (Node | string | number | false | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === "class") {
      el.className = String(v);
    } else if (k === "html") {
      el.innerHTML = String(v);
    } else {
      el.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === false || c == null) continue;
    el.append(typeof c === "number" ? String(c) : c);
  }
  return el;
}

export function toast(message: string): void {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = h("div", { class: "toast", role: "status" }, message);
  root.appendChild(el);
  window.setTimeout(() => el.remove(), 4000);
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtDuration(startMs: number, endMs: number): string {
  const min = Math.max(1, Math.round((endMs - startMs) / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`;
}

/** Format a summed volume (canonical kg) in display units, rounded whole. */
export function fmtVolume(volumeKg: number, units: Units): string {
  const v = units === "kg" ? volumeKg : volumeKg * LB_PER_KG;
  return `${Math.round(v).toLocaleString("en-US")} ${units}`;
}

export function debounce<F extends (...args: never[]) => void>(
  fn: F,
  ms: number,
): F {
  let t: number | null = null;
  return ((...args: never[]) => {
    if (t !== null) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  }) as F;
}

/** Navigate via hash router. */
export function go(path: string): void {
  if (location.hash === `#${path}`)
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = `#${path}`;
}
