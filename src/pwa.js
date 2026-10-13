/**
 * 液體解鎖 (Liquid Cipher) PWA：Service Worker 註冊、安裝按鈕與新版本提示
 */
export function initPWA() {
    if (!('serviceWorker' in navigator)) return;
    const btnInstall = document.getElementById('btn-install');
    const banner = document.getElementById('update-banner');
    const btnReload = document.getElementById('btn-reload');
    /** @type {any} */
    let deferredPrompt = null;
    /** @type {ServiceWorker|null} */
    let waitingWorker = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        btnInstall.hidden = false;
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        btnInstall.hidden = true;
    });
    btnInstall.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        btnInstall.hidden = true;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
    });
    /**
     * @param {ServiceWorker} worker
     */
    const offerUpdate = (worker) => {
        waitingWorker = worker;
        banner.hidden = false;
    };
    navigator.serviceWorker.register('./sw.js').then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
        registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
            });
        });
    }).catch((err) => {
        console.warn('Service Worker 註冊失敗:', err);
    });
    btnReload.addEventListener('click', () => {
        if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    });
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}
