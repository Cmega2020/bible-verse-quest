// Kpemi's Scripture Quest — Service Worker
// Strategy:
//   HTML  → Network-first  (always fetches latest, falls back to cache if offline)
//   Assets (icons, manifest) → Cache-first (fast, rarely change)

const CACHE_NAME = 'ksq-v2';  // ← Bump this version number each time you deploy

const CACHE_ASSETS = [
  './BibleVerseQuest.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Install: pre-cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_ASSETS))
  );
  self.skipWaiting(); // activate immediately, don't wait for old SW to finish
});

// Activate: delete any old caches from previous versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // take control of all open tabs immediately
});

// Fetch strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTML = event.request.destination === 'document' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname === '/' || url.pathname === '';

  if (isHTML) {
    // ── NETWORK-FIRST for HTML ──────────────────────────────────────
    // Always try to get the freshest version from GitHub Pages.
    // Only serve from cache if the network is unavailable (offline).
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(response => {
          // Save the fresh copy into cache for offline fallback
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)) // offline fallback
    );
  } else {
    // ── CACHE-FIRST for icons / manifest / fonts ────────────────────
    // These files rarely change, so serve from cache for speed.
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
