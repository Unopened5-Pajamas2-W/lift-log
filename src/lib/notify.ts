/** Rest-timer notifications: local service-worker notifications only — no
 *  backend, no push subscription, zero network. On iOS (16.4+) this requires
 *  the app to be installed via Add to Home Screen and the permission prompt
 *  must be triggered by a direct user tap (see Settings toggle).
 *
 *  All paths are best-effort: a notification failure must never break the
 *  workout flow, so callers are fire-and-forget with swallowed rejections. */

let restNotifyEnabled = false;

/** Gate consulted by notifyRestDone/notifyRestCancelled. Wired from the
 *  Settings toggle (restNotify) so the timer module stays UI-agnostic. */
export function setRestNotifyEnabled(enabled: boolean): void {
  restNotifyEnabled = enabled;
}

/** Test-only: reset module state between cases (no production callers). */
export function resetRestNotifyStateForTests(): void {
  restNotifyEnabled = false;
}

/** Request notification permission. MUST be called from a direct user-tap
 *  call stack — iOS only shows the prompt in response to a gesture. */
export async function requestRestNotifyPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  try {
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

function notificationsAvailable(): boolean {
  return (
    restNotifyEnabled &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted" &&
    "serviceWorker" in navigator
  );
}

/** Show the "rest done" notification via the service worker (mobile browsers
 *  throw on `new Notification(...)`, so SW showNotification is the only path). */
export function notifyRestDone(seconds: number): void {
  if (!notificationsAvailable()) return;
  try {
    void navigator.serviceWorker.ready
      .then((registration) =>
        registration.showNotification("Rest complete — next set", {
          body: `Your ${seconds} s rest is over. Go!`,
          tag: "rest-done", // replaces any stale rest notification
          silent: true, // the WebAudio triple beep is the sound channel
          data: { url: "#/workout" },
        }),
      )
      .catch(() => {
        /* best-effort: uninstalled SW / denied late / iOS quirk */
      });
  } catch {
    /* best-effort */
  }
}

/** Close a pending rest notification (timer stopped or adjusted). */
export function notifyRestCancelled(): void {
  if (!notificationsAvailable()) return;
  try {
    void navigator.serviceWorker.ready
      .then((registration) =>
        registration.getNotifications({ tag: "rest-done" }),
      )
      .then((list) => {
        for (const n of list) n.close();
      })
      .catch(() => {
        /* best-effort */
      });
  } catch {
    /* best-effort */
  }
}

/** Listen for notification taps relayed by the SW and route the app. */
export function listenForNotificationClicks(): void {
  if (!("serviceWorker" in navigator)) return;
  try {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type === "REST_NOTIFY_OPEN" && typeof data.url === "string") {
        window.focus();
        location.hash = data.url;
      }
    });
  } catch {
    /* best-effort */
  }
}
