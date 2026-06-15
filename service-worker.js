/* OurSpace GitHub Pages PWA service worker. Keeps the app shell available without trying to pre-cache every large game file. */
const CACHE_VERSION = 'ourspace-pwa-v4-layout-zoom';
const CORE_ASSETS = [
  './',
  './index.html',
  './dino-nerdzone.html',
  './squishy-cottage.html',
  './manifest.webmanifest',
  './css/ourspace-pwa.css',
  './css/ourspace-module-workshop.css',
  './css/ourspace-messenger.css',
  './css/ourspace_mobile_games_module.css',
  './css/ourspace-game-rewards.css',
  './js/ourspace-pwa.js',
  './js/ourspace-gas-app.js',
  './js/ourspace-module-workshop.js',
  './js/ourspace-backend-bridge.js',
  './js/ourspace-messenger.js',
  './js/ourspace-currency-core.js',
  './js/ourspace-game-reward-override.js',
  './js/ourspace-play-to-win-adapter.js',
  './js/portal-storage.js',
  './assets/css/ourspace-auth.css',
  './assets/js/config.js',
  './assets/js/backend-bridge.js',
  './assets/js/auth-ui.js',
  './onyx/onyx-widget.css',
  './onyx/onyx-widget.js',
  './onyx/js/onyx-gas-config.js',
  './onyx/css/onyx.css',
  './onyx/data/onyx_singular_persona.json',
  './onyx/data/onyx_mood_manifest.json',
  './onyx/assets/onyx-moods/onyx_snuggly.png',
  './onyx/assets/onyx-moods/onyx_caring.png',
  './onyx/assets/onyx-moods/onyx_listening.png',
  './onyx/assets/onyx-moods/onyx_judgmental.png',
  './onyx/assets/onyx-moods/onyx_advising_professor.png',
  './onyx/assets/onyx-moods/onyx_thinking.png',
  './onyx/assets/onyx-moods/onyx_thoughtful.png',
  './onyx/assets/onyx-moods/onyx_sleepy.png',
  './onyx/assets/onyx-moods/onyx_hungry.png',
  './onyx/assets/onyx-moods/onyx_purring.png',
  './assets/json/dino_cal.json',
  './assets/json/dino_sched.json',
  './assets/json/dino_store.json',
  './assets/json/dino_hobby.json',
  './assets/json/squishy_cal.json',
  './assets/json/squishy_sched.json',
  './assets/json/squishy_store.json',
  './assets/json/squishy_hobby.json',
  './assets/json/games.json',
  './assets/json/game_ids.json',
  './assets/json/game_rules.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.allSettled(CORE_ASSETS.map(asset => cache.add(new Request(asset, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request){
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request);
    if(fresh && fresh.ok) cache.put(request, fresh.clone()).catch(()=>{});
    return fresh;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match('./index.html')) || Response.error();
  }
}

async function cacheFirst(request){
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if(cached) return cached;
  const fresh = await fetch(request);
  if(fresh && fresh.ok) cache.put(request, fresh.clone()).catch(()=>{});
  return fresh;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;
  const url = new URL(request.url);
  if(url.origin !== location.origin) return;
  if(request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  if(url.pathname.includes('/games/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  if(/\.(?:css|js|json|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
