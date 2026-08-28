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

        // 讀取存檔
        const hasSavedData = this.gameState.loadSaveData();
        this.soundSynth.enabled = this.gameState.soundEnabled;

        // 調整畫布尺寸
        this.handleResize();

        // 啟動 60fps 渲染循環與 UI 控制器
        this.animationEngine.start();
        this.uiController.init();

        // 載入當前目標關卡
        const targetLevel = this.gameState.activeLevel;
        await this.loadLevel(targetLevel);
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
     */
    async loadLevel(level) {
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
            this.gameState.applyLevelDefinition(levelDef);

            // 4. 計算排版並同步 UI
            this.canvasManager.computeLayout(levelDef.initialBoard.length, levelDef.tubeShapes);
            this.uiController.syncUI();
        } catch (err) {
            console.error('關卡載入異常，載入備援盤面:', err);
            const fallbackDef = generateLevel(level);
            this.gameState.applyLevelDefinition(fallbackDef);
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
     * 監聽視窗尺寸改變
     */
    initResizeHandler() {
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
}

// 頁面載入完成後啟動應用程式
window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
