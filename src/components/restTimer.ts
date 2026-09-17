/** Rest-timer card: presets, custom, ±15 s, live countdown. */
import { createRestTimer, formatCountdown } from "../lib/timer.ts";
import { h } from "../lib/ui.ts";

export function renderRestTimer(
  defaultSeconds: number,
  onChangeDefault: (s: number) => void,
): HTMLElement {
  const label = h(
    "div",
    { class: "muted", "aria-live": "polite" },
    "Rest: idle",
  );
  const card = h(
    "div",
    { class: "card" },
    h("strong", {}, "Rest timer"),
    label,
  );
  const btnRow = h("div", { class: "row" });
  const timer = createRestTimer({
    onTick: (r) => {
      label.textContent = timer.running
        ? `Rest: ${formatCountdown(r)}`
        : r > 0
          ? `Rest paused: ${formatCountdown(r)}`
          : "Rest: done";
    },
    onDone: () => {
      label.textContent = "Rest: done — go!";
    },
  });
  for (const preset of [60, 90, 120, 180]) {
    btnRow.appendChild(
      h(
        "button",
        {
          "aria-label": `Start ${preset} second rest`,
          onclick: () => {
            onChangeDefault(preset);
            timer.start(preset);
          },
        },
        `${preset}s`,
      ),
    );
  }
  const controls = h(
    "div",
    { class: "row" },
    h(
      "button",
      { "aria-label": "Subtract 15 seconds", onclick: () => timer.adjust(-15) },
      "−15",
    ),
    h(
      "button",
      { "aria-label": "Add 15 seconds", onclick: () => timer.adjust(15) },
      "+15",
    ),
    h("button", { onclick: () => timer.stop() }, "Stop"),
    h(
      "button",
      {
        class: "primary",
        "aria-label": "Start rest timer",
        onclick: () => timer.start(defaultSeconds),
      },
      "Start",
    ),
  );
  card.append(btnRow, controls);
  // Dispose timer when the view unmounts (router replaces #view content).
  new MutationObserver((_, obs) => {
    if (!card.isConnected) {
      timer.dispose();
      obs.disconnect();
    }
  }).observe(card.parentElement ?? document.body, {
    childList: true,
    subtree: true,
  });
  return card;
}
