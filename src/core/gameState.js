/**
 * 液體解鎖 (Liquid Cipher) 核心遊戲狀態機模組
 * 管理單一路徑線性進度、Water Sort 傾倒物理規則、撤銷/重做堆疊與存檔持久化。
 */
import { APP_CONFIG } from './constants.js';
import { cloneBoard, isBoardSolved, getTopColorBlock, isTubeComplete } from './solver.js';
export class GameState {
    /**
     * @param {Object} [options]
     */
    constructor(options = {}) {
        this.activeLevel = 1;
        this.highestUnlockedLevel = 1;
        /** @type {import('./types.js').LevelDefinition|null} */
        this.currentLevelDef = null;
        /** @type {string[][]} */
        this.currentBoard = [];
        /** @type {string[][][]} */
        this.moveHistory = [];
        /** @type {string[][][]} */
        this.redoHistory = [];
        this.elapsedMs = 0;
        this.colorBlindMode = false;
        this.soundEnabled = true;
        this.moveCount = 0;
    }
    /**
     * 從 localStorage 讀取存檔資料
     * @returns {boolean} 是否成功載入既有存檔
     */
    loadSaveData() {
        if (typeof localStorage === 'undefined') return false;
        try {
            const raw = localStorage.getItem(APP_CONFIG.storageKey);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (data.schemaVersion !== APP_CONFIG.schemaVersion) {
                return false;
            }
            this.activeLevel = data.activeLevel || 1;
            this.highestUnlockedLevel = Math.max(this.activeLevel, data.highestUnlockedLevel || 1);
            this.colorBlindMode = !!data.colorBlindMode;
            this.soundEnabled = data.soundEnabled !== undefined ? data.soundEnabled : true;
            this.elapsedMs = data.elapsedMs || 0;
            this.currentBoard = data.currentBoard && Array.isArray(data.currentBoard) ? cloneBoard(data.currentBoard) : [];
            this.moveHistory = data.moveHistory && Array.isArray(data.moveHistory) ? data.moveHistory.map(b => cloneBoard(b)) : [];
            this.redoHistory = data.redoHistory && Array.isArray(data.redoHistory) ? data.redoHistory.map(b => cloneBoard(b)) : [];
            this.moveCount = this.moveHistory.length;
            return true;
        } catch (e) {
            console.error('載入存檔異常:', e);
            return false;
        }
    }
    /**
     * 將當前遊戲狀態寫入 localStorage
     */
    persistSaveData() {
        if (typeof localStorage === 'undefined' || !this.currentLevelDef) return;
        try {
            const data = {
                schemaVersion: APP_CONFIG.schemaVersion,
                generatorVersion: APP_CONFIG.generatorVersion,
                activeLevel: this.activeLevel,
                highestUnlockedLevel: this.highestUnlockedLevel,
                levelSeed: this.currentLevelDef.derivedSeed,
                generationAttempt: this.currentLevelDef.attempt,
                initialBoard: this.currentLevelDef.initialBoard,
                currentBoard: this.currentBoard,
                moveHistory: this.moveHistory,
                redoHistory: this.redoHistory,
                knownOptimalSteps: this.currentLevelDef.knownOptimalSteps,
                elapsedMs: this.elapsedMs,
                colorBlindMode: this.colorBlindMode,
                soundEnabled: this.soundEnabled
            };
            localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('寫入存檔異常:', e);
        }
    }
    /**
     * 讀取特定關卡的本地驗證快取
     * @param {number} level
     * @returns {import('./types.js').LevelDefinition|null}
     */
    getLevelCache(level) {
        if (typeof localStorage === 'undefined') return null;
        try {
            const raw = localStorage.getItem(`${APP_CONFIG.cachePrefix}${level}`);
            if (!raw) return null;
            const def = JSON.parse(raw);
            if (def && def.schemaVersion === APP_CONFIG.schemaVersion && def.level === level) {
                return def;
            }
        } catch (e) {
            console.error('讀取關卡快取異常:', e);
        }
        return null;
    }
    /**
     * 儲存已驗證之關卡定義至本地快取
     * @param {import('./types.js').LevelDefinition} levelDef
     */
    setLevelCache(levelDef) {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(
                `${APP_CONFIG.cachePrefix}${levelDef.level}`,
                JSON.stringify(levelDef)
            );
        } catch (e) {
            console.error('寫入關卡快取異常:', e);
        }
    }
    /**
     * 載入並啟用指定關卡定義
     * @param {import('./types.js').LevelDefinition} levelDef
     * @param {string[][]} [resumeBoard] - 可選的還原盤面
     */
    applyLevelDefinition(levelDef, resumeBoard = null) {
        this.currentLevelDef = levelDef;
        this.activeLevel = levelDef.level;
        this.highestUnlockedLevel = Math.max(this.highestUnlockedLevel, levelDef.level);
        if (resumeBoard && Array.isArray(resumeBoard) && resumeBoard.length === levelDef.initialBoard.length) {
            this.currentBoard = cloneBoard(resumeBoard);
        } else {
            this.currentBoard = cloneBoard(levelDef.initialBoard);
            this.moveHistory = [];
            this.redoHistory = [];
            this.moveCount = 0;
            this.elapsedMs = 0;
        }
        this.setLevelCache(levelDef);
        this.persistSaveData();
    }
    /**
     * 驗證從 fromIndex 到 toIndex 的倒水動作是否合法
     * @param {number} from
     * @param {number} to
     * @returns {{ valid: boolean, amount: number, colorId: string, reason?: string }}
     */
    canPour(from, to) {
        if (!this.currentLevelDef) return { valid: false, amount: 0, colorId: '', reason: '無關卡資料' };
        if (from === to) return { valid: false, amount: 0, colorId: '', reason: '不可倒向同一試管' };
        const board = this.currentBoard;
        if (from < 0 || from >= board.length || to < 0 || to >= board.length) {
            return { valid: false, amount: 0, colorId: '', reason: '試管索引超出範圍' };
        }
        const srcTube = board[from];
        const tgtTube = board[to];
        const capacity = this.currentLevelDef.capacity;
        if (srcTube.length === 0) {
            return { valid: false, amount: 0, colorId: '', reason: '來源試管為空' };
        }
        if (tgtTube.length >= capacity) {
            return { valid: false, amount: 0, colorId: '', reason: '目標試管已滿' };
        }
        const { color: srcColor, count: srcBlockCount } = getTopColorBlock(srcTube);
        if (tgtTube.length > 0) {
            const tgtTopColor = tgtTube[tgtTube.length - 1];
            if (tgtTopColor !== srcColor) {
                return { valid: false, amount: 0, colorId: srcColor, reason: '液體色彩不符，無法混合' };
            }
        }
        const availableSpace = capacity - tgtTube.length;
        const amount = Math.min(srcBlockCount, availableSpace);
        return {
            valid: amount > 0,
            amount,
            colorId: srcColor
        };
    }
    /**
     * 執行倒水操作
     * @param {number} from
     * @param {number} to
     * @returns {import('./types.js').MoveAction|null}
     */
    executePour(from, to) {
        const check = this.canPour(from, to);
        if (!check.valid) return null;
        // 記錄復原歷史
        this.moveHistory.push(cloneBoard(this.currentBoard));
        this.redoHistory = []; // 清空重做堆疊
        // 轉移液體
        for (let i = 0; i < check.amount; i++) {
            const item = this.currentBoard[from].pop();
            this.currentBoard[to].push(item);
        }
        this.moveCount++;
        this.persistSaveData();
        return {
            from,
            to,
            amount: check.amount,
            colorId: check.colorId
        };
    }
    /**
     * 復原上一步 (Undo)
     * @returns {boolean}
     */
    undo() {
        if (this.moveHistory.length === 0) return false;
        const prevBoard = this.moveHistory.pop();
        this.redoHistory.push(cloneBoard(this.currentBoard));
        this.currentBoard = prevBoard;
        this.moveCount++;
        this.persistSaveData();
        return true;
    }
    /**
     * 重做下一步 (Redo)
     * @returns {boolean}
     */
    redo() {
        if (this.redoHistory.length === 0) return false;
        const nextBoard = this.redoHistory.pop();
        this.moveHistory.push(cloneBoard(this.currentBoard));
        this.currentBoard = nextBoard;
        this.moveCount++;
        this.persistSaveData();
        return true;
    }
    /**
     * 重置本關卡至初始狀態
     */
    resetCurrentLevel() {
        if (!this.currentLevelDef) return;
        this.moveHistory = [];
        this.redoHistory = [];
        this.currentBoard = cloneBoard(this.currentLevelDef.initialBoard);
        this.moveCount = 0;
        this.elapsedMs = 0;
        this.persistSaveData();
    }
    /**
     * 檢查當前盤面是否達成通關目標
     * @returns {boolean}
     */
    isWon() {
        if (!this.currentLevelDef) return false;
        return isBoardSolved(this.currentBoard, this.currentLevelDef.capacity);
    }
}