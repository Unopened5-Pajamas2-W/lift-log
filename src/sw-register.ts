/** Register the hand-rolled SW; defer updates while a workout is active. */
export function registerServiceWorker(opts: {
  hasActiveWorkout: () => boolean | Promise<boolean>;
}): void {
  if (!("serviceWorker" in navigator)) return;
  const isLocalhost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  // Register on https or localhost only; skip file:// previews.
  if (!window.isSecureContext && !isLocalhost) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        let pollId: number | null = null;
        const stopPolling = () => {
          if (pollId !== null) {
            window.clearInterval(pollId);
            pollId = null;
          }
        };
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            void (async () => {
              if (
                worker.state !== "installed" ||
                !navigator.serviceWorker.controller
              )
                return;
              let active = false;
              try {
                active = await opts.hasActiveWorkout();
              } catch {
                active = false;
              }
              if (active) {
                toast(
                  "Update downloaded — will apply after you finish this workout.",
                );
                pollId = window.setInterval(() => {
                  void (async () => {
                    let stillActive = true;
                    try {
                      stillActive = await opts.hasActiveWorkout();
                    } catch {
                      stillActive = true;
                    }
                    if (!stillActive) {
                      stopPolling();
                      worker.postMessage("SKIP_WAITING");
                    }
                  })();
                }, 10_000);
              } else {
                toast("Update available — reloading.", true);
                worker.postMessage("SKIP_WAITING");
              }
            })();
          });
        });
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          stopPolling();
          window.location.reload();
        });
      })
      .catch(() => {
        /* offline-first: registration failure must not break the app */
      });
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
