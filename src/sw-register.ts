/** Register the generated PWA service worker (vite-plugin-pwa); defer
 *  applying updates while a workout is active. */
import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker(opts: {
  hasActiveWorkout: () => boolean | Promise<boolean>;
}): void {
  if (!("serviceWorker" in navigator)) return;
  const isLocalhost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  // Register on https or localhost only; skip file:// previews.
  if (!window.isSecureContext && !isLocalhost) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      void (async () => {
        let active = false;
        try {
          active = await opts.hasActiveWorkout();
        } catch {
          active = false;
        }
        if (!active) {
          toast("Update available — reloading.", true);
          void updateSW(true);
          return;
        }
        toast("Update downloaded — will apply after you finish this workout.");
        const pollId = window.setInterval(() => {
          void (async () => {
            let stillActive = true;
            try {
              stillActive = await opts.hasActiveWorkout();
            } catch {
              stillActive = true;
            }
            if (!stillActive) {
              window.clearInterval(pollId);
              void updateSW(true);
            }
          })();
        }, 10_000);
      })();
    },
  });
}

/** Minimal toast used by shell-level events (views use their own). */
export function toast(message: string, _reloadHint = false): void {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  root.appendChild(el);
  window.setTimeout(() => el.remove(), 5000);
}
