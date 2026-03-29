const CACHE_NAME = 'baby-tracker-v2';

// Install: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for app files, skip Google API calls
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and Google API requests
  if (event.request.method !== 'GET' || url.hostname.includes('googleapis.com')) {
    return;
  }

  // Network-first: try network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
