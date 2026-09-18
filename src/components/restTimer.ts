/** Rest-timer card: presets, ±15 s, countdown, wake lock while running.
 *  Quiet a11y: label is plain text; a hidden announcer speaks only on expiry. */
import { createRestTimer, ensureAudio, formatCountdown } from "../lib/timer.ts";
import { acquireScreenWakeLock } from "../lib/wakeLock.ts";
import { h, onDetached } from "../lib/ui.ts";

export interface RestTimerHandle {
  element: HTMLElement;
  start: (seconds?: number) => void;
  stop: () => void;
}

export function renderRestTimer(
  defaultSeconds: number,
  onChangeDefault: (s: number) => void,
): RestTimerHandle {
  const label = h("div", { class: "muted" }, "Rest: idle");
  // Written ONLY on expiry (spec R6d): one announcement, no per-second chatter.
  const doneAnnouncer = h(
    "div",
    { class: "sr-only", "aria-live": "polite" },
    "",
  );
  const card = h(
    "div",
    { class: "card" },
    h("strong", {}, "Rest timer"),
    label,
    doneAnnouncer,
  );
  const btnRow = h("div", { class: "row" });

  // Wake lock is held only while the timer runs; acquisitions are generation-
  // tagged so a release racing an in-flight acquire never leaks a lock.
  let releaseLock: () => void = () => {};
  let lockGeneration = 0;
  async function holdLock(): Promise<void> {
    const generation = ++lockGeneration;
    const release = await acquireScreenWakeLock();
    if (generation === lockGeneration) releaseLock = release;
    else release();
  }
  function dropLock(): void {
    lockGeneration++;
    releaseLock();
    releaseLock = () => {};
  }

  const timer = createRestTimer({
    onTick: (r) => {
      card.classList.toggle("rest-done", r === 0 && !timer.running);
      label.textContent = timer.running
        ? `Rest: ${formatCountdown(r)}`
        : r > 0
          ? `Rest paused: ${formatCountdown(r)}`
          : "Rest done — go!";
    },
    onDone: () => {
      doneAnnouncer.textContent = "Rest complete. Next set.";
      dropLock();
    },
  });

  const handle: RestTimerHandle = {
    element: card,
    // Acknowledge any prior "done" state, unlock audio (called from gestures),
    // hold the screen awake, then (re)start the countdown.
    start(seconds?: number) {
      card.classList.remove("rest-done");
      doneAnnouncer.textContent = "";
      ensureAudio();
      void holdLock();
      timer.start(seconds ?? defaultSeconds);
    },
    stop() {
      card.classList.remove("rest-done");
      timer.stop();
      dropLock();
      label.textContent = "Rest: idle";
    },
  };

  for (const preset of [60, 90, 120, 180]) {
    btnRow.appendChild(
      h(
        "button",
        {
          "aria-label": `Start ${preset} second rest`,
          onclick: () => {
            onChangeDefault(preset);
            handle.start(preset);
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
      {
        "aria-label": "Subtract 15 seconds",
        onclick: () => timer.adjust(-15),
      },
      "−15",
    ),
    h(
      "button",
      { "aria-label": "Add 15 seconds", onclick: () => timer.adjust(15) },
      "+15",
    ),
    h("button", { onclick: () => handle.stop() }, "Stop"),
    h(
      "button",
      {
        class: "primary",
        "aria-label": "Start rest timer",
        onclick: () => handle.start(),
      },
      "Start",
    ),
  );
  card.append(btnRow, controls);

  // The OS drops wake locks when the document hides; re-request on return.
  const onVisibility = (): void => {
    if (document.visibilityState === "visible" && timer.running) void holdLock();
  };
  document.addEventListener("visibilitychange", onVisibility);

  // Dispose when the view unmounts (router replaces #view content): stop the
  // timer (restores document.title), release the lock, drop the listener.
  onDetached(card, () => {
    timer.dispose();
    dropLock();
    document.removeEventListener("visibilitychange", onVisibility);
  });
  return handle;
}
