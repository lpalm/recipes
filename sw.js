// Serves the app and recipes from the network when possible and from the last good copy when offline.
const CACHE = 'recipes-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'parser.js', 'map.js', 'units.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copy)));
    }
    return response;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
