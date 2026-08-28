/**
 * 液體解鎖 (Liquid Cipher) PWA Service Worker
 * 實作 Cache-First + Stale-While-Revalidate 離線快取與版本更新機制。
 */

const CACHE_NAME = 'liquid-cipher-v1';

// 預快取核心 App Shell 與靜態資源清單
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './src/main.js',
    './src/styles/main.css',
    './src/styles/components.css',
    './src/core/constants.js',
    './src/core/types.js',
    './src/core/hash.js',
    './src/core/prng.js',
    './src/core/color.js',
    './src/core/difficulty.js',
    './src/core/solver.js',
    './src/core/generator.js',
    './src/core/fallbackLevels.js',
    './src/core/gameState.js',
    './src/render/shapes.js',
    './src/render/canvas.js',
    './src/render/liquidRenderer.js',
    './src/render/animationEngine.js',
    './src/audio/soundSynth.js',
    './src/ui/uiController.js',
    './src/workers/solverWorker.js',
    './logo/favicon-32x32.png',
    './logo/android-chrome-192x192.png',
    './logo/android-chrome-512x512.png',
    './logo/apple-touch-icon.png',
    './logo/favicon.ico'
];

// 安裝階段：預快取所有靜態核心資源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
});

// 啟用階段：清除舊版本快取並接管客戶端
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

// 網路請求攔截：Cache-First 搭配 Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // 只攔截 GET 請求
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // 處理同源資源 (Local Assets)
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(request);

                // 背景發起網路請求更新快取 (Stale-While-Revalidate)
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // 離線狀態下網路失敗為正常現象
                });

                // 若有快取直接回傳快取，否則等待網路回應
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // 處理外部 Google Fonts 字型與樣式快取
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

// 監聽訊息：支援從 UI 觸發立即套用新版本
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
