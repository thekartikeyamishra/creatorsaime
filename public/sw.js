/* CreatorsAI service worker — conservative by design.
 * - Static build assets & icons: cache-first (they are content-hashed).
 * - Public page navigations: network-first, falling back to cache, then /offline.
 * - Never caches API calls, authenticated areas, or cross-origin requests (Firebase etc.).
 */
const VERSION = "v3";
const STATIC_CACHE = `cai-static-${VERSION}`;
const PAGE_CACHE = `cai-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRIVATE_PREFIXES = ["/api/", "/dashboard", "/admin", "/login", "/signup", "/p/", "/d/", "/c/", "/r/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGE_CACHE).then((c) => c.addAll([OFFLINE_URL])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    const isPrivate = PRIVATE_PREFIXES.some((p) => url.pathname.startsWith(p));
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!isPrivate && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (!isPrivate && (await caches.match(req))) || (await caches.match(OFFLINE_URL)) || Response.error()),
    );
  }
});
