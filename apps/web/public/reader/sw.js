// Caches the ornament reader so it opens with no connection after the first visit.
const C = "ascend-reader-v1";
self.addEventListener("install", (e) => e.waitUntil(caches.open(C).then((c) => c.addAll(["./", "./index.html"])).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => { if (new URL(e.request.url).pathname.includes("/reader/")) e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))); });
