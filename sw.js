const CACHE_VERSION = 'v2';
const CACHE_NAME = 'floreria-static-' + CACHE_VERSION;
const ASSETS = ['index.html', 'styles.css', 'app.js', 'manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('floreria-static-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || !ASSETS.some((a) => u.pathname.endsWith(a))) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
