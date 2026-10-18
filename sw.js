const CACHE_NAME = 'liquid-cipher-v3';
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './src/audio/soundSynth.js',
    './src/core/board.js',
    './src/core/color.js',
    './src/core/constants.js',
    './src/core/difficulty.js',
    './src/core/fallbackLevels.js',
    './src/core/generator.js',
    './src/core/hash.js',
    './src/core/prng.js',
    './src/core/session.js',
    './src/core/solver.js',
    './src/core/stopwatch.js',
    './src/core/storage.js',
    './src/core/tasks.js',
    './src/main.js',
    './src/pwa.js',
    './src/render/layout.js',
    './src/render/shapes.js',
    './src/render/stage.js',
    './src/render/tubePainter.js',
    './src/services/solverClient.js',
    './src/styles/components.css',
    './src/styles/main.css',
    './src/ui/dialogs.js',
    './src/ui/hud.js',
    './src/ui/input.js',
    './src/workers/solverWorker.js',
    './logo/favicon-32x32.png',
    './logo/android-chrome-192x192.png',
    './logo/android-chrome-512x512.png',
    './logo/apple-touch-icon.png',
    './logo/favicon.ico'
];
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
});
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                });
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                if (cachedResponse) return cachedResponse;
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (e) {
                    return cachedResponse || new Response('', { status: 408, statusText: 'Request Timeout' });
                }
            })
        );
    }
});
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});