const CACHE_VERSION = 'v5';
const CACHE_NAME = 'floreria-static-' + CACHE_VERSION;
const ASSETS = [
  'index.html',
  'styles.css',
  'app.js',
  'tests.js',
  'manifest.json',
  'sw.js',
  'js/domain.js',
  'js/storage.js'
];

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
  const pathMatch = ASSETS.some((a) => u.pathname.endsWith(a) || u.pathname.endsWith('/' + a));
  if (u.origin !== location.origin || !pathMatch) return;
  const isHtml = u.pathname.endsWith('.html') || u.pathname.endsWith('/');
  const fetchOpts = isHtml ? { cache: 'reload' } : {};
  e.respondWith(
    fetch(e.request, fetchOpts)
      .then((r) => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
