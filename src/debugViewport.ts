/**
 * TEMPORARY debug harness (RCA 2026-09-19, tab-bar blank space) — delete
 * before commit. Activated only when the URL contains "debug=viewport"
 * (query string or hash). Renders a fixed readout of the iOS standalone
 * viewport geometry — screen/window/visualViewport heights, resolved
 * env(safe-area-inset-bottom/top) via a probe element, display mode, and the
 * tab bar's bottom edge — refreshed on navigation, resize, and a 1s interval,
 * since env() flips may not emit events. Enable via `?debug=viewport` (or
 * `#/?debug=viewport`) in the URL, or `localStorage.debugViewport = "1"`.
 */

/** Environment value for a CSS env() variable, resolved via a probe element. */
function envValue(name: string): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;width:0;height:env(${name}, 0px)`;
  document.body.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe).height) || 0;
  probe.remove();
  return value;
}

/** Live geometry readout lines for the overlay. */
function readout(): string {
  const vv = window.visualViewport;
  const doc = document.documentElement;
  const tabbar = document.querySelector("nav.tabbar");
  const lines = [
    `screen.h      ${window.screen.height}`,
    `innerHeight   ${window.innerHeight}`,
    `vv.height     ${vv ? Math.round(vv.height) : "n/a"}`,
    `vv.offsetTop  ${vv ? Math.round(vv.offsetTop) : "n/a"}`,
    `vv.pan        ${vv ? Math.round(window.innerHeight - vv.height - vv.offsetTop) : "n/a"}px`,
    `scrollY       ${window.scrollY}`,
    `doc.scrollH   ${doc.scrollHeight} / client ${doc.clientHeight}`,
    `env bottom    ${envValue("safe-area-inset-bottom")}px`,
    `env top       ${envValue("safe-area-inset-top")}px`,
    `--safe-b      ${getComputedStyle(document.documentElement).getPropertyValue("--safe-b").trim()}`,
    `display-mode  standalone=${matchMedia("(display-mode: standalone)").matches} fullscreen=${matchMedia("(display-mode: fullscreen)").matches}`,
  ];
  if (tabbar) {
    const rect = tabbar.getBoundingClientRect();
    const label = tabbar.querySelector("a");
    const labelBottom = label ? Math.round(label.getBoundingClientRect().bottom) : NaN;
    lines.push(
      `tabbar.bottom ${Math.round(rect.bottom)} (viewport bottom ${window.innerHeight})`,
      `label.bottom  ${labelBottom} → ${Math.round(window.innerHeight - labelBottom)}px above viewport bottom`,
    );
  }
  return lines.join("\n");
}

/** Whether the harness is requested: URL flag or a persisted localStorage
 * switch (the installed PWA launches from the manifest start_url, which
 * strips a query param — set `localStorage.debugViewport = "1"` once via the
 * Safari Web Inspector to persist across cold relaunches). */
function requested(): boolean {
  return (
    /debug=viewport/.test(location.search + location.hash) ||
    localStorage.getItem("debugViewport") === "1"
  );
}

/** Install the overlay if requested. */
export function installViewportDebug(): void {
  if (!requested()) return;
  const box = document.createElement("pre");
  box.style.cssText =
    "position:fixed;top:max(8px, env(safe-area-inset-top, 0px));left:8px;z-index:999;" +
    "margin:0;padding:8px;background:#111;color:#7CFC00;font:10px/1.5 ui-monospace,monospace;" +
    "border-radius:6px;pointer-events:none;white-space:pre";
  const refresh = (): void => {
    box.textContent = readout();
  };
  window.addEventListener("hashchange", refresh);
  window.addEventListener("resize", refresh);
  window.visualViewport?.addEventListener("resize", refresh);
  window.visualViewport?.addEventListener("scroll", refresh);
  setInterval(refresh, 1000);
  refresh();
  document.body.appendChild(box);
  console.info("[viewport-debug] harness active");
}
