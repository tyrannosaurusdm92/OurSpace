const OURSPACE_CACHE = 'ourspace-pwa-v10-mobile-cloud-auth';
const CORE_ASSETS = [
  "./ourspace.html",
  "./OurSpace.html",
  "./william.html",
  "./jasper.html",
  "./manifest.webmanifest",
  "./browserconfig.xml",
  "./assets/ourspace-data-catalogs.js",
  "./assets/ourspace-embedded-catalogs.js",
  "./assets/ourspace-user-core.js",
  "./assets/ourspace-user.css",
  "./assets/ourspace-auth.js",
  "./assets/ourspace-auth.css",
  "./assets/legacy-portal-storage.js",
  "./assets/legacy-ourspace-allowed-games.js",
  "./assets/legacy-ourspace-currency-core.js",
  "./assets/legacy-ourspace-game-currency-bridge.js",
  "./assets/legacy-ourspace-game-reward-override.js",
  "./assets/legacy-ourspace-game-rewards.css",
  "./assets/legacy-ourspace-play-to-win-adapter.js",
  "./assets/audio/message-ding.mp3",
  "./assets/icons/ourspace-icon-180.png",
  "./assets/icons/ourspace-icon-192.png",
  "./assets/icons/ourspace-icon-512.png",
  "./assets/icons/ourspace-icon-384.png"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(OURSPACE_CACHE)
      .then(cache => Promise.all(CORE_ASSETS.map(asset => cache.add(asset).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== OURSPACE_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => { const copy = response.clone(); caches.open(OURSPACE_CACHE).then(cache => cache.put(request, copy)); return response; })
        .catch(() => caches.match(request).then(match => match || caches.match('./ourspace.html') || caches.match('./OurSpace.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(OURSPACE_CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => cached))
  );
});
