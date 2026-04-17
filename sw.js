// ══════════════════════════════════════════════════════════
//  Society Manager — Service Worker v2.0
//  GitHub Pages: https://sparowt.github.io/society-manager/
//  Caches all app files for 100% offline use
// ══════════════════════════════════════════════════════════

const CACHE_NAME   = 'society-manager-v2';
const OFFLINE_PAGE = '/society-manager/index.html';

// Files to cache on install
const PRECACHE_URLS = [
  '/society-manager/index.html',
  '/society-manager/manifest.json',
  '/society-manager/icon-192.png',
  '/society-manager/icon-512.png',
  '/society-manager/sw.js',
];

// External CDN resources to cache for offline use
const CDN_URLS = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

// ── INSTALL: Pre-cache all critical files ──────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing Society Manager Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app files...');
      return cache.addAll(PRECACHE_URLS)
        .then(() => {
          return Promise.allSettled(
            CDN_URLS.map(url =>
              fetch(url, { mode: 'cors' })
                .then(resp => resp.ok ? cache.put(url, resp) : null)
                .catch(() => null)
            )
          );
        });
    }).then(() => {
      console.log('[SW] All files cached. App ready for offline use.');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: Remove old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache-first strategy ────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;
  if (event.request.url.startsWith('blob:')) return;
  if (event.request.url.startsWith('data:')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        fetch(event.request)
          .then(networkResp => {
            if (networkResp && networkResp.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResp.clone()));
            }
          }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request)
        .then(networkResp => {
          if (!networkResp || !networkResp.ok) return networkResp;
          const respToCache = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respToCache));
          return networkResp;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
