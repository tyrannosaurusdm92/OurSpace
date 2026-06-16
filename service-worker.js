/* OurSpace PWA service worker: app-shell cache for installable phone-app style access. */
const CACHE_NAME = 'ourspace-pwa-v2026-06-16-no-current-transparent-grid';
const APP_SHELL = [
  './',
  './index.html',
  './dino-nerdzone.html',
  './squishy-cottage.html',
  './manifest.webmanifest',
  './css/ourspace-pwa.css',
  './css/ourspace-module-workshop.css',
  './css/ourspace-repair.css',
  './css/ourspace-messenger.css',
  './assets/js/config.js',
  './assets/js/backend-bridge.js',
  './assets/js/auth-ui.js',
  './js/ourspace-pwa.js',
  './js/ourspace-module-workshop.js',
  './js/ourspace-backend-bridge.js',
  './js/ourspace-messenger.js',
  './js/ourspace-gas-app.js',
  './js/ourspace-data-bundle.js',
  './onyx/onyx-widget.css',
  './onyx/onyx-widget.js',
  './vendor/jeeliz/jeelizFaceFilter.js',
  './vendor/jeeliz/NN_VERYLIGHT_1.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
      return response;
    }).catch(() => {
      if (request.mode === 'navigate') return caches.match('./index.html');
      return cached;
    }))
  );
});
