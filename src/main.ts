/** App entry: styles, seed, SW registration, hash router. */
import { renderApp } from "./app.ts";
import { ensureSeeded, getActiveWorkout } from "./lib/store.ts";
import { registerServiceWorker } from "./sw-register.ts";
import { listenForNotificationClicks } from "./lib/notify.ts";
import "./styles.css";

declare const __APP_VERSION__: string;

async function boot(): Promise<void> {
  const shell = document.getElementById("app");
  if (!shell) throw new Error("#app root missing");
  try {
    await ensureSeeded();
  } catch (err) {
    console.error("Seed failed (IndexedDB unavailable?)", err);
    shell.textContent =
      "Lift Log needs IndexedDB storage, which is unavailable in this browser context.";
    return;
  }
  registerServiceWorker({
    hasActiveWorkout: () =>
      getActiveWorkout()
        .then((w) => !!w)
        .catch(() => false),
  });
  const render = () => renderApp(shell).catch(console.error);
  listenForNotificationClicks();
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#/today";
  await renderApp(shell);
  console.info(
    `Lift Log v${typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"}`,
  );
}

void boot();
