/// <reference lib="webworker" />

const CACHE_NAME = 'aura-recorder-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    const e = event as ExtendableEvent;
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    const e = event as ExtendableEvent;
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const e = event as FetchEvent;
    // Skip non-GET requests and API calls
    if (e.request.method !== 'GET' || e.request.url.includes('/api/')) {
        return;
    }

    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // Cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(e.request).then((cached) => cached || new Response('Offline', { status: 503 }))
            )
    );
});

export { };
