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
export function computeRank(moves, optimal) {
    if (optimal === null) return null;
    if (moves <= optimal) return 'S';
    if (moves <= optimal + RANK_POLICY.rankAMaxOver) return 'A';
    return 'B';
}
function isMoveShape(move) {
    return !!move && Number.isInteger(move.from) && Number.isInteger(move.to)
        && Number.isInteger(move.amount) && typeof move.colorId === 'string';
}
export class GameSession extends EventTarget {
    constructor(now) {
        super();
        this.levelDef = null;
        this.board = [];
        this.history = [];
        this.redoStack = [];
        this.hintsUsed = 0;
        this.stopwatch = new Stopwatch(now);
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
    emit(reason) {
        this.dispatchEvent(new CustomEvent('change', { detail: { reason } }));
    }
    bumpVersion() {
        this.version++;
    }
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
        const redoValid = snapshot.redo.every(isMoveShape) && this.isRedoChainValid(board, levelDef.capacity, snapshot.redo);
        this.board = board;
        this.history = snapshot.history.map(m => ({ ...m }));
        this.redoStack = redoValid ? snapshot.redo.map(m => ({ ...m })) : [];
        this.hintsUsed = Number.isInteger(snapshot.hintsUsed) && snapshot.hintsUsed >= 0 ? snapshot.hintsUsed : 0;
        this.stopwatch.reset(Number.isFinite(snapshot.elapsedMs) && snapshot.elapsedMs >= 0 ? snapshot.elapsedMs : 0);
        return true;
    }
    isRedoChainValid(board, capacity, redo) {
        const probe = cloneBoard(board);
        for (let i = redo.length - 1; i >= 0; i--) {
            const check = evaluatePour(probe, capacity, redo[i].from, redo[i].to);
            if (!check.ok || check.move.amount !== redo[i].amount) return false;
            applyMoveInPlace(probe, check.move);
        }
        return true;
    }
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
    previewPour(from, to) {
        return evaluatePour(this.board, this.capacity, from, to);
    }
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
    undo() {
        if (!this.canUndo || this.isSolved) return null;
        const move = this.history.pop();
        revertMoveInPlace(this.board, move);
        this.redoStack.push(move);
        this.bumpVersion();
        this.emit('undo');
        return move;
    }
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
    setClockActive(active) {
        if (!active) {
            this.stopwatch.pause();
        } else if (this.moves > 0 && !this.isSolved) {
            this.stopwatch.start();
        }
    }
}