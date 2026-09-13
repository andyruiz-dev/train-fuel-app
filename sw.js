// Bump CACHE_VERSION on every deploy. Old caches are deleted on activate,
// and skipWaiting + clients.claim mean a refresh (not a hard-refresh) is
// enough to pick up a new version — this fixes the old app's "must clear
// cache after every push" problem.
const CACHE_VERSION = "tf-v2";
const SHELL_FILES = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls — the Worker/D1 is the source of truth for data.
  if (url.pathname.startsWith("/api/")) return;

  // Network-first for the app shell, falling back to cache offline.
  // cache: "reload" forces this past the browser's own HTTP cache too —
  // "network-first" at the service-worker level doesn't by itself mean the
  // underlying fetch() bypasses ordinary HTTP caching, which is what let
  // GitHub Pages' CDN keep serving a stale copy for a while after a push.
  event.respondWith(
    fetch(event.request, { cache: "reload" })
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
