/** Manual-only PWA update checks (vite-plugin-pwa `prompt` mode).
 *
 *  Privacy invariant: registering the service worker must never cause a
 *  network request on app open, so registration passes `immediate: false`
 *  and nothing here calls `registration.update()` except `checkForAppUpdate`
 *  (wired to Settings → Check for updates). A downloaded update is applied
 *  only via an explicit `applyAppUpdate()` tap, and never mid-workout.
 *  (Note: the browser itself may still revalidate sw.js ~once/day per spec;
 *  that traffic is outside app code's control.) */
import { registerSW } from "./pwa-register.ts";
import { toast } from "./lib/ui.ts";

/** Outcome of a manual update check, for the Settings UI. */
export type UpdateCheckResult =
  | "update-ready"
  | "up-to-date"
  | "offline"
  | "unavailable";

type HasActiveWorkout = () => boolean | Promise<boolean>;
type ApplyUpdate = (reloadPage?: boolean) => Promise<void>;

const DEFER_POLL_MS = 10_000;
const INSTALL_TIMEOUT_MS = 30_000;

let swRegistration: ServiceWorkerRegistration | null = null;
let applyUpdate: ApplyUpdate | null = null;
let isWorkoutActive: HasActiveWorkout = () => false;
let updateReady = false;
let deferPollId: number | null = null;

/** True once a newer service worker is downloaded and waiting to activate. */
export function isAppUpdateReady(): boolean {
  return updateReady;
}

/** Test-only: reset module state between cases (no production callers). */
export function resetAppUpdateStateForTests(): void {
  swRegistration = null;
  applyUpdate = null;
  isWorkoutActive = () => false;
  updateReady = false;
  if (deferPollId !== null) {
    window.clearInterval(deferPollId);
    deferPollId = null;
  }
}

/** Register the generated service worker. Makes no network requests itself. */
export function registerServiceWorker(opts: {
  hasActiveWorkout: HasActiveWorkout;
}): void {
  if (!("serviceWorker" in navigator)) return;
  const isLocalhost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  // Register on https or localhost only; skip file:// previews.
  if (!window.isSecureContext && !isLocalhost) return;

  isWorkoutActive = opts.hasActiveWorkout;
  applyUpdate = registerSW({
    // Never check for updates as a side effect of opening the app; checks
    // happen only via checkForAppUpdate() (Settings → Check for updates).
    immediate: false,
    onRegisteredSW: (_url, registration) => {
      swRegistration = registration ?? null;
    },
    onNeedRefresh: () => {
      void handleNeedRefresh();
    },
  });
}

/** Record a waiting update and notify; never reloads without an explicit tap. */
async function handleNeedRefresh(): Promise<void> {
  updateReady = true;
  let active = false;
  try {
    active = await isWorkoutActive();
  } catch {
    active = false;
  }
  if (!active) {
    toast("Update ready — open Settings to reload.");
    return;
  }
  toast("Update downloaded — will be ready after you finish this workout.");
  if (deferPollId !== null) window.clearInterval(deferPollId);
  deferPollId = window.setInterval(() => {
    void (async () => {
      let stillActive = true;
      try {
        stillActive = await isWorkoutActive();
      } catch {
        stillActive = true;
      }
      if (!stillActive && deferPollId !== null) {
        window.clearInterval(deferPollId);
        deferPollId = null;
        toast("Update ready — open Settings to reload.");
      }
    })();
  }, DEFER_POLL_MS);
}

/** Check for an app update. Call only from explicit user action. */
export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  if (updateReady) return "update-ready";
  const reg = swRegistration;
  if (!reg) return "unavailable";
  if (!navigator.onLine) return "offline";
  try {
    await reg.update();
  } catch {
    return "offline";
  }
  // update() resolves once the check finishes; a newer worker is then either
  // waiting or still installing (precaching takes a few seconds).
  if (reg.waiting !== null || updateReady) return "update-ready";
  const installing = reg.installing;
  if (installing === null) return "up-to-date";
  const installed = await waitForInstalled(installing);
  return installed || updateReady ? "update-ready" : "up-to-date";
}

/** Apply a downloaded update (reload). Refuses while a workout is active. */
export async function applyAppUpdate(): Promise<void> {
  const apply = applyUpdate;
  if (!apply || !updateReady) return;
  let active = false;
  try {
    active = await isWorkoutActive();
  } catch {
    active = false;
  }
  if (active) {
    toast("Finish your workout first — then reload from Settings.");
    return;
  }
  await apply(true);
}

/** Resolve true once `worker` reaches `installed` (false if it fails/times out). */
function waitForInstalled(worker: ServiceWorker): Promise<boolean> {
  if (worker.state === "installed") return Promise.resolve(true);
  if (worker.state === "redundant") return Promise.resolve(false);
  return new Promise((resolve) => {
    const done = (value: boolean): void => {
      window.clearTimeout(timer);
      worker.removeEventListener("statechange", onChange);
      resolve(value);
    };
    const onChange = (): void => {
      if (worker.state === "installed") done(true);
      else if (worker.state === "redundant") done(false);
    };
    const timer = window.setTimeout(() => done(false), INSTALL_TIMEOUT_MS);
    worker.addEventListener("statechange", onChange);
  });
}
