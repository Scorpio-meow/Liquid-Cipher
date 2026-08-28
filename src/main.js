/**
 * 液體解鎖 (Liquid Cipher) 應用程式啟動進入點
 * 協調狀態機、Web Worker 求解運算、Canvas 渲染管線與 UI 控制器。
 */

import { GameState } from './core/gameState.js';
import { SoundSynth } from './audio/soundSynth.js';
import { CanvasManager } from './render/canvas.js';
import { AnimationEngine } from './render/animationEngine.js';
import { UIController } from './ui/uiController.js';
import { generateLevel } from './core/generator.js';
import { solveBoundedHint } from './core/solver.js';
import { EXACT_SOLVER_POLICY } from './core/constants.js';

class App {
    constructor() {
        this.gameState = new GameState();
        this.soundSynth = new SoundSynth();
        this.canvas = document.getElementById('game-canvas');
        this.canvasManager = new CanvasManager(this.canvas);
        this.animationEngine = new AnimationEngine(this.canvasManager, this.gameState);

        /** @type {Worker|null} */
        this.worker = null;
        this.pendingRequests = new Map();
        this.requestCounter = 0;

        this.uiController = new UIController(
            this.gameState,
            this.canvasManager,
            this.animationEngine,
            this.soundSynth,
            {
                onNextLevel: () => this.advanceToNextLevel(),
                onReplayLevel: () => this.replayCurrentLevel(),
                onRequestHint: () => this.requestHint()
            }
        );
    }

    /**
     * 初始化應用程式
     */
    async init() {
        this.initWorker();
        this.initResizeHandler();
        this.initPWA();

        // 讀取存檔
        const hasSavedData = this.gameState.loadSaveData();
        this.soundSynth.enabled = this.gameState.soundEnabled;

        // 調整畫布尺寸
        this.handleResize();

        // 啟動 60fps 渲染循環與 UI 控制器
        this.animationEngine.start();
        this.uiController.init();

        // 載入當前目標關卡 (若有未完成盤面則還原)
        const targetLevel = this.gameState.activeLevel;
        const resumeBoard = hasSavedData && this.gameState.currentBoard && this.gameState.currentBoard.length > 0
            ? this.gameState.currentBoard
            : null;
        await this.loadLevel(targetLevel, resumeBoard);
    }

    /**
     * 初始化 Web Worker
     */
    initWorker() {
        try {
            this.worker = new Worker(new URL('./workers/solverWorker.js', import.meta.url), {
                type: 'module'
            });

            this.worker.onmessage = (e) => {
                const { type, requestId, success, result, error } = e.data;
                const resolver = this.pendingRequests.get(requestId);
                if (resolver) {
                    this.pendingRequests.delete(requestId);
                    if (success) {
                        resolver.resolve(result);
                    } else {
                        resolver.reject(new Error(error));
                    }
                }
            };

            this.worker.onerror = (err) => {
                console.warn('Web Worker 運行受限，將無縫切換為同步備援運算:', err);
                for (const [id, resolver] of this.pendingRequests) {
                    resolver.reject(err);
                }
                this.pendingRequests.clear();
                this.worker = null;
            };
        } catch (e) {
            console.warn('瀏覽器環境無法建立 Web Worker，將使用主執行緒運算:', e);
            this.worker = null;
        }
    }

    /**
     * 向 Worker 發送非同步任務 (若無 Worker 則在主執行緒執行)
     * @param {string} type
     * @param {Object} payload
     * @returns {Promise<any>}
     */
    callWorker(type, payload) {
        const reqId = ++this.requestCounter;

        if (this.worker) {
            return new Promise((resolve, reject) => {
                this.pendingRequests.set(reqId, { resolve, reject });
                this.worker.postMessage({ type, requestId: reqId, payload });
            });
        }

        // 主執行緒同步備援執行
        return new Promise((resolve) => {
            if (type === 'GENERATE_LEVEL') {
                const def = generateLevel(payload.level, payload.policy);
                resolve(def);
            } else if (type === 'SOLVE_HINT') {
                const hint = solveBoundedHint(payload.board, payload.capacity, payload.options);
                resolve(hint);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * 載入並發布指定關卡
     * @param {number} level
     * @param {string[][]} [resumeBoard] - 可選的還原盤面
     */
    async loadLevel(level, resumeBoard = null) {
        this.uiController.showLoading();

        try {
            // 1. 檢查本地快取
            let levelDef = this.gameState.getLevelCache(level);

            // 2. 若無快取，呼叫 Worker 生成並通過門禁驗證
            if (!levelDef) {
                levelDef = await this.callWorker('GENERATE_LEVEL', {
                    level,
                    policy: EXACT_SOLVER_POLICY
                });
            }

            // 3. 套用至遊戲狀態機
            this.gameState.applyLevelDefinition(levelDef, resumeBoard);

            // 4. 計算排版並同步 UI
            this.canvasManager.computeLayout(levelDef.initialBoard.length, levelDef.tubeShapes);
            this.uiController.syncUI();
        } catch (err) {
            console.error('關卡載入異常，載入備援盤面:', err);
            const fallbackDef = generateLevel(level);
            this.gameState.applyLevelDefinition(fallbackDef, resumeBoard);
            this.canvasManager.computeLayout(fallbackDef.initialBoard.length, fallbackDef.tubeShapes);
            this.uiController.syncUI();
        } finally {
            this.uiController.hideLoading();
        }
    }

    /**
     * 推進至下一關 (L + 1)
     */
    async advanceToNextLevel() {
        const nextL = this.gameState.activeLevel + 1;
        await this.loadLevel(nextL);
    }

    /**
     * 重玩本關卡
     */
    replayCurrentLevel() {
        this.gameState.resetCurrentLevel();
        this.uiController.syncUI();
    }

    /**
     * 請求智能提示
     */
    async requestHint() {
        if (!this.gameState.currentLevelDef) return;
        const currentBoard = this.gameState.currentBoard;
        const capacity = this.gameState.currentLevelDef.capacity;

        try {
            const hintMove = await this.callWorker('SOLVE_HINT', {
                board: currentBoard,
                capacity,
                options: { maxNodes: 20000, maxDepth: 60 }
            });

            if (hintMove) {
                this.uiController.showHint(hintMove);
            } else {
                this.soundSynth.playError();
            }
        } catch (err) {
            console.warn('求解提示異常:', err);
            this.soundSynth.playError();
        }
    }

    /**
     * 初始化 PWA Service Worker、安裝提示與更新監聽
     */
    initPWA() {
        if (!('serviceWorker' in navigator)) return;

        const btnInstall = document.getElementById('btn-install-pwa');
        const updateToast = document.getElementById('pwa-update-toast');
        const btnReload = document.getElementById('btn-reload-pwa');

        let deferredPrompt = null;
        let waitingWorker = null;

        // 監聽 PWA 安裝提示事件
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (btnInstall) {
                btnInstall.style.display = 'inline-flex';
            }
        });

        // 監聽應用程式成功安裝
        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            if (btnInstall) {
                btnInstall.style.display = 'none';
            }
        });

        // 點擊自訂安裝按鈕
        if (btnInstall) {
            btnInstall.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                btnInstall.style.display = 'none';
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                deferredPrompt = null;
            });
        }

        // 註冊 Service Worker
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then((registration) => {
                // 檢查是否有正在等待啟用的新版本
                if (registration.waiting) {
                    waitingWorker = registration.waiting;
                    if (updateToast) updateToast.style.display = 'flex';
                }

                // 監聽新版本發現事件
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            waitingWorker = newWorker;
                            if (updateToast) updateToast.style.display = 'flex';
                        }
                    });
                });
            }).catch((err) => {
                console.warn('PWA Service Worker 註冊受限:', err);
            });
        });

        // 點擊「立即重載」套用新版本
        if (btnReload) {
            btnReload.addEventListener('click', () => {
                if (waitingWorker) {
                    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        }

        // 當 controller 變更時自動重新載入頁面
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    }

    /**
     * 處理視窗尺寸變化
     */
    handleResize() {
        const container = document.querySelector('.canvas-wrapper');
        const containerWidth = container ? container.clientWidth : 860;
        this.canvasManager.resize(containerWidth);

        if (this.gameState.currentLevelDef) {
            this.canvasManager.computeLayout(
                this.gameState.currentBoard.length,
                this.gameState.currentLevelDef.tubeShapes
            );
        }
    }

    /**
     * 監聽視窗尺寸改變與行動裝置螢幕旋轉
     */
    initResizeHandler() {
        const onResize = () => this.handleResize();
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(onResize, 100);
        });
        if (typeof window !== 'undefined' && window.visualViewport) {
            window.visualViewport.addEventListener('resize', onResize);
        }
    }
}

// 頁面載入完成後啟動應用程式
window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
