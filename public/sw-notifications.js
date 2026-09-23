/* Rest-timer notification tap handler. Loaded by the Workbox-generated service
 *  worker (vite.config.ts → workbox.importScripts). Relays the tap to the app
 *  via postMessage; the page listens in src/lib/notify.ts and routes to the
 *  workout view. No network requests, no push subscription — notifications are
 *  shown locally by the page via registration.showNotification(). */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "#/workout";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: "REST_NOTIFY_OPEN", url });
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      },
    ),
  );
});
