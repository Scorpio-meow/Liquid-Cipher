/**
 * 液體解鎖 (Liquid Cipher) 對局狀態機
 * 持有單一關卡的盤面、移動歷史與計時；不碰 DOM 與儲存，狀態變化以 'change' 事件通知。
 * 歷史只記錄 MoveAction，復原/重做以逆運算完成，不保存整盤快照。
 */
import { RANK_POLICY } from './constants.js';
import {
    applyMoveInPlace,
    cloneBoard,
    countCompletedTubes,
    evaluatePour,
    hasAnyLegalMove,
    isBoardSolved,
    revertMoveInPlace
} from './board.js';
import { Stopwatch } from './stopwatch.js';
/**
 * 依步數與已證明最少步數計算評級
 * @param {number} moves
 * @param {number|null} optimal
 * @returns {'S'|'A'|'B'|null} 未證明最少步數時無法評級
 */
export function computeRank(moves, optimal) {
    if (optimal === null) return null;
    if (moves <= optimal) return 'S';
    if (moves <= optimal + RANK_POLICY.rankAMaxOver) return 'A';
    return 'B';
}
/**
 * @param {unknown} move
 * @returns {move is import('./types.js').MoveAction}
 */
function isMoveShape(move) {
    return !!move && Number.isInteger(move.from) && Number.isInteger(move.to)
        && Number.isInteger(move.amount) && typeof move.colorId === 'string';
}
export class GameSession extends EventTarget {
    /**
     * @param {() => number} now - 時間來源
     */
    constructor(now) {
        super();
        /** @type {import('./types.js').LevelDefinition|null} */
        this.levelDef = null;
        /** @type {string[][]} */
        this.board = [];
        /** @type {import('./types.js').MoveAction[]} */
        this.history = [];
        /** @type {import('./types.js').MoveAction[]} */
        this.redoStack = [];
        this.hintsUsed = 0;
        this.stopwatch = new Stopwatch(now);
        /** 每次盤面變動遞增，用來丟棄過期的非同步結果（例如提示） */
        this.version = 0;
    }
    get capacity() {
        return this.levelDef ? this.levelDef.capacity : 0;
    }
    get level() {
        return this.levelDef ? this.levelDef.level : 0;
    }
    get moves() {
        return this.history.length;
    }
    get optimalSteps() {
        return this.levelDef ? this.levelDef.knownOptimalSteps : null;
    }
    get isSolved() {
        return !!this.levelDef && isBoardSolved(this.board, this.capacity);
    }
    get isStuck() {
        return !!this.levelDef && !this.isSolved && !hasAnyLegalMove(this.board, this.capacity);
    }
    get completedTubes() {
        return countCompletedTubes(this.board, this.capacity);
    }
    get canUndo() {
        return this.history.length > 0;
    }
    get canRedo() {
        return this.redoStack.length > 0;
    }
    get rank() {
        return computeRank(this.moves, this.optimalSteps);
    }
    /**
     * @param {string} reason
     */
    emit(reason) {
        this.dispatchEvent(new CustomEvent('change', { detail: { reason } }));
    }
    bumpVersion() {
        this.version++;
    }
    /**
     * 載入關卡；若提供快照則由初始盤面重播移動序列還原進度，任何一步不合法即視為快照無效並從頭開始
     * @param {import('./types.js').LevelDefinition} levelDef
     * @param {import('./types.js').SessionSnapshot|null} snapshot
     * @returns {boolean} 是否成功還原快照
     */
    load(levelDef, snapshot) {
        this.levelDef = levelDef;
        const restored = snapshot ? this.tryRestore(levelDef, snapshot) : false;
        if (!restored) {
            this.board = cloneBoard(levelDef.initialBoard);
            this.history = [];
            this.redoStack = [];
            this.hintsUsed = 0;
            this.stopwatch.reset();
        }
        this.bumpVersion();
        this.emit('load');
        return restored;
    }
    /**
     * @param {import('./types.js').LevelDefinition} levelDef
     * @param {import('./types.js').SessionSnapshot} snapshot
     * @returns {boolean}
     */
    tryRestore(levelDef, snapshot) {
        if (snapshot.level !== levelDef.level || snapshot.derivedSeed !== levelDef.derivedSeed) return false;
        if (!Array.isArray(snapshot.history) || !Array.isArray(snapshot.redo)) return false;
        const board = cloneBoard(levelDef.initialBoard);
        for (const move of snapshot.history) {
            if (!isMoveShape(move)) return false;
            const check = evaluatePour(board, levelDef.capacity, move.from, move.to);
            if (!check.ok || check.move.amount !== move.amount) return false;
            applyMoveInPlace(board, check.move);
        }
        // 重做堆疊需能從目前盤面依序逆推回去才有效，否則捨棄重做
        const redoValid = snapshot.redo.every(isMoveShape) && this.isRedoChainValid(board, levelDef.capacity, snapshot.redo);
        this.board = board;
        this.history = snapshot.history.map(m => ({ ...m }));
        this.redoStack = redoValid ? snapshot.redo.map(m => ({ ...m })) : [];
        this.hintsUsed = Number.isInteger(snapshot.hintsUsed) && snapshot.hintsUsed >= 0 ? snapshot.hintsUsed : 0;
        this.stopwatch.reset(Number.isFinite(snapshot.elapsedMs) && snapshot.elapsedMs >= 0 ? snapshot.elapsedMs : 0);
        return true;
    }
    /**
     * @param {string[][]} board
     * @param {number} capacity
     * @param {import('./types.js').MoveAction[]} redo
     * @returns {boolean}
     */
    isRedoChainValid(board, capacity, redo) {
        const probe = cloneBoard(board);
        for (let i = redo.length - 1; i >= 0; i--) {
            const check = evaluatePour(probe, capacity, redo[i].from, redo[i].to);
            if (!check.ok || check.move.amount !== redo[i].amount) return false;
            applyMoveInPlace(probe, check.move);
        }
        return true;
    }
    /**
     * @returns {import('./types.js').SessionSnapshot|null}
     */
    snapshot() {
        if (!this.levelDef) return null;
        return {
            level: this.levelDef.level,
            derivedSeed: this.levelDef.derivedSeed,
            history: this.history.map(m => ({ ...m })),
            redo: this.redoStack.map(m => ({ ...m })),
            elapsedMs: Math.round(this.stopwatch.elapsedMs),
            hintsUsed: this.hintsUsed
        };
    }
    /**
     * 評估倒水但不執行
     * @param {number} from
     * @param {number} to
     */
    previewPour(from, to) {
        return evaluatePour(this.board, this.capacity, from, to);
    }
    /**
     * 執行倒水；首次移動時啟動計時，通關時暫停計時
     * @param {number} from
     * @param {number} to
     * @returns {ReturnType<typeof evaluatePour>}
     */
    pour(from, to) {
        if (this.isSolved) return { ok: false, reason: 'level-solved' };
        const check = this.previewPour(from, to);
        if (!check.ok) return check;
        applyMoveInPlace(this.board, check.move);
        this.history.push(check.move);
        this.redoStack = [];
        this.stopwatch.start();
        if (this.isSolved) this.stopwatch.pause();
        this.bumpVersion();
        this.emit('pour');
        return check;
    }
    /** @returns {import('./types.js').MoveAction|null} */
    undo() {
        if (!this.canUndo || this.isSolved) return null;
        const move = this.history.pop();
        revertMoveInPlace(this.board, move);
        this.redoStack.push(move);
        this.bumpVersion();
        this.emit('undo');
        return move;
    }
    /** @returns {import('./types.js').MoveAction|null} */
    redo() {
        if (!this.canRedo || this.isSolved) return null;
        const move = this.redoStack.pop();
        applyMoveInPlace(this.board, move);
        this.history.push(move);
        this.stopwatch.start();
        if (this.isSolved) this.stopwatch.pause();
        this.bumpVersion();
        this.emit('redo');
        return move;
    }
    /**
     * 重置本關：盤面、歷史、提示次數與計時全部歸零
     */
    restart() {
        if (!this.levelDef) return;
        this.board = cloneBoard(this.levelDef.initialBoard);
        this.history = [];
        this.redoStack = [];
        this.hintsUsed = 0;
        this.stopwatch.reset();
        this.bumpVersion();
        this.emit('restart');
    }
    recordHintUsed() {
        this.hintsUsed++;
        this.emit('hint');
    }
    /**
     * 分頁隱藏等情況暫停計時；僅在已開始且未通關時才續跑
     * @param {boolean} active
     */
    setClockActive(active) {
        if (!active) {
            this.stopwatch.pause();
        } else if (this.moves > 0 && !this.isSolved) {
            this.stopwatch.start();
        }
    }
}
