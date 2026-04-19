const CACHE_NAME = "unidex-erp-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./pwa/mobile-nav.css",
  "./theme.js",
  "./erp.js",
  "./js/config.js",
  "./js/utils.js",
  "./js/customer-api.js",
  "./js/state-store.js",
  "./js/dom-elements.js",
  "./js/navigation.js",
  "./js/modules/dashboard-module.js",
  "./js/modules/products-module.js",
  "./js/modules/sales-module.js",
  "./js/modules/admin-module.js",
  "./js/modules/module-registry.js",
  "./manifest.json",
  "./pwa/icons/icon-192.png",
  "./pwa/icons/icon-512.png",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  "https://unpkg.com/html5-qrcode",
  "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS.filter((asset) => asset.startsWith(".") || asset.startsWith("/")))
        .then(() => {
          const externalAssets = ASSETS.filter((asset) => asset.startsWith("http"));
          return Promise.allSettled(externalAssets.map((url) => cache.add(url)));
        });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url.startsWith("chrome-extension")) {
    return;
  }

  if (isAppShellRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

function isAppShellRequest(request) {
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const destination = request.destination;
  const pathname = url.pathname;

  return sameOrigin && (
    request.mode === "navigate" ||
    destination === "document" ||
    destination === "script" ||
    destination === "style" ||
    pathname.endsWith(".html") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".webmanifest") ||
    pathname.endsWith("/sw.js")
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "no-store" });

    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    if (request.mode === "navigate") {
      return caches.match("./index.html");
    }

    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response && response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }

  return response;
}
