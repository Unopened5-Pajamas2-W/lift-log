/** iOS install instructions (Add to Home Screen is manual — no beforeinstallprompt). */
import { h } from "../lib/ui.ts";

export function renderInstallHelp(): HTMLElement {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const card = h(
    "div",
    { class: "card" },
    h("strong", {}, "Install on iPhone"),
  );
  if (isStandalone) {
    card.appendChild(
      h("p", { class: "muted" }, "Installed — running fullscreen."),
    );
    return card;
  }
  const ol = h(
    "ol",
    {},
    h("li", {}, "Open this page in Safari."),
    h("li", {}, "Tap Share (square with arrow), then “Add to Home Screen”."),
    h("li", {}, "Tap Add. Launch “Lift Log” from your Home Screen."),
    h(
      "li",
      {},
      isIos
        ? "Tip: it then works offline in airplane mode."
        : "Tip: on desktop use Chrome → Install, or add this URL on your iPhone.",
    ),
  );
  card.appendChild(ol);
  return card;
}
