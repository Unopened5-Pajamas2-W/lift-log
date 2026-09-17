/* Hand-rolled service worker: versioned app-shell precache, no Workbox. */

/* global self, caches, fetch */
// Bump on each release so old caches are purged (keep in sync with package.json).
const APP_VERSION = "0.1.0";
const CACHE_NAME = `lift-log-${APP_VERSION}`;
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./offline.html",
];

self.addEventListener("install", (event) => {
  // NOTE: no skipWaiting here — activation is deferred until no workout is
  // active. The app sends a SKIP_WAITING message when safe (see sw-register.ts).
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith("lift-log-") && k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Only handle same-origin; let everything else pass through (there should be none).
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("./index.html").then((hit) => hit ?? caches.match("./offline.html")),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok && url.protocol.startsWith("http")) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});

// Deferred-update handshake: app asks us to activate when safe (no active workout).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
