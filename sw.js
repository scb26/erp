const CACHE_NAME = 'unidex-erp-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './pwa/mobile-nav.css',
  './theme.js',
  './erp.js',
  './js/config.js',
  './js/utils.js',
  './js/customer-api.js',
  './js/state-store.js',
  './js/dom-elements.js',
  './js/navigation.js',
  './js/modules/dashboard-module.js',
  './js/modules/customers-module.js',
  './js/modules/products-module.js',
  './js/modules/invoices-module.js',
  './js/modules/admin-module.js',
  './js/modules/module-registry.js',
  './manifest.json',
  './pwa/icons/icon-192.png',
  './pwa/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://unpkg.com/html5-qrcode',
  'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local assets, ignore failures for external URLs
      return cache.addAll(ASSETS.filter(a => a.startsWith('.') || a.startsWith('/')))
        .then(() => {
          // Try to cache external assets separately (non-blocking)
          const externalAssets = ASSETS.filter(a => a.startsWith('http'));
          return Promise.allSettled(externalAssets.map(url => cache.add(url)));
        });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests or browser extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // If offline and not cached, return offline page for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
