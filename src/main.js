/**
 * 液體解鎖 (Liquid Cipher) 應用程式進入點
 * 協調對局狀態、存檔、背景求解、舞台渲染與介面；遊戲規則本身在 core/ 內。
 */
import { WORKER_POLICY } from './core/constants.js';
import { isTubeComplete } from './core/board.js';
import { GameSession } from './core/session.js';
import { SaveStore, updateRecord } from './core/storage.js';
import { SolverClient } from './services/solverClient.js';
import { StageRenderer } from './render/stage.js';
import { SoundSynth } from './audio/soundSynth.js';
import { HudView, StageOverlay, Toaster } from './ui/hud.js';
import { HelpDialog, WinDialog } from './ui/dialogs.js';
import { InputController } from './ui/input.js';
import { initPWA } from './pwa.js';
const POUR_REJECT_MESSAGES = {
    'source-empty': '這支試管是空的',
    'target-full': '目標試管已經滿了',
    'color-mismatch': '頂層顏色不同，不能倒入'
};
/**
 * @returns {Storage|null}
 */
function getLocalStorage() {
    try {
        return window.localStorage;
    } catch (e) {
        console.warn('無法使用 localStorage，進度不會保存:', e);
        return null;
    }
}
/**
 * @param {number|number[]} pattern
 */
function vibrate(pattern) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
}
class App {
    constructor() {
        this.store = new SaveStore(getLocalStorage());
        this.profile = this.store.loadProfile();
        this.session = new GameSession(() => performance.now());
        this.sound = new SoundSynth();
        this.sound.setEnabled(this.profile.settings.sound);
        this.solver = new SolverClient(typeof Worker === 'undefined'
            ? null
            : () => new Worker(new URL('./workers/solverWorker.js', import.meta.url), { type: 'module' }));
        this.canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
        this.stageEl = /** @type {HTMLElement} */ (document.getElementById('stage'));
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.renderer = new StageRenderer(this.canvas, {
            getBoard: () => this.session.board,
            getCapacity: () => this.session.capacity,
            getColorBlind: () => this.profile.settings.colorBlind
        }, { reducedMotion });
        this.hud = new HudView();
        this.overlay = new StageOverlay();
        this.toast = new Toaster();
        this.help = new HelpDialog();
        this.win = new WinDialog({
            onNext: () => this.loadLevel(this.session.level + 1, null),
            onReplay: () => this.restart()
        });
        this.input = new InputController(this.canvas, this.renderer, () => this.session.board.length, {
            onTube: (id) => this.handleTube(id),
            onAction: (action) => this.handleAction(action),
            isBlocked: () => this.win.isOpen || this.help.isOpen || this.overlay.visible || !this.session.levelDef
        });
        /** @type {{ level: number, promise: Promise<import('./core/types.js').LevelDefinition> }|null} */
        this.prefetch = null;
        this.loadToken = 0;
        this.hintPending = false;
        /** @type {number[]} 傾倒動畫期間的點選，動畫結束後依序處理，避免快速操作被吞掉 */
        this.inputQueue = [];
    }
    async init() {
        this.session.addEventListener('change', () => {
            this.hud.render(this.session);
            this.persist();
        });
        this.hud.renderSettings(this.profile.settings);
        this.input.bind();
        new ResizeObserver(([entry]) => {
            this.renderer.resize(entry.contentRect.width, entry.contentRect.height);
        }).observe(this.stageEl);
        this.renderer.start();
        setInterval(() => {
            if (this.session.stopwatch.running) this.hud.renderTime(this.session.stopwatch.elapsedMs);
        }, 250);
        document.addEventListener('visibilitychange', () => {
            this.session.setClockActive(document.visibilityState === 'visible');
            this.persist();
        });
        window.addEventListener('pagehide', () => this.persist());
        initPWA();
        await this.loadLevel(this.profile.activeLevel, this.profile.session);
        if (!this.profile.seenHelp) {
            this.profile.seenHelp = true;
            this.persist();
            this.help.open();
        }
    }
    persist() {
        this.profile.session = this.session.snapshot();
        this.store.saveProfile(this.profile);
    }
    /**
     * @param {number} level
     * @returns {Promise<import('./core/types.js').LevelDefinition>}
     */
    obtainLevel(level) {
        const cached = this.store.getLevel(level);
        if (cached) return Promise.resolve(cached);
        if (this.prefetch && this.prefetch.level === level) return this.prefetch.promise;
        return this.solver.request('GENERATE_LEVEL', { level }, WORKER_POLICY.generateTimeoutMs);
    }
    /**
     * 背景預先生成下一關，通關後免等待
     * @param {number} level
     */
    prefetchLevel(level) {
        if (this.store.getLevel(level)) return;
        const promise = this.solver.request('GENERATE_LEVEL', { level }, WORKER_POLICY.generateTimeoutMs);
        this.prefetch = { level, promise };
        promise
            .then((def) => this.store.putLevel(def, this.session.level))
            .catch((err) => {
                console.warn(`預先生成第 ${level} 關失敗，屆時再生成:`, err);
                if (this.prefetch && this.prefetch.promise === promise) this.prefetch = null;
            });
    }
    /**
     * @param {number} level
     * @param {import('./core/types.js').SessionSnapshot|null} snapshot
     */
    async loadLevel(level, snapshot) {
        const token = ++this.loadToken;
        this.inputQueue = [];
        this.renderer.clearHint();
        this.renderer.selectedId = null;
        const cached = this.store.getLevel(level);
        if (!cached) this.overlay.showLoading(level);
        try {
            const def = cached ?? await this.obtainLevel(level);
            if (token !== this.loadToken) return;
            this.store.putLevel(def, level);
            this.profile.activeLevel = level;
            this.profile.highestLevel = Math.max(this.profile.highestLevel, level);
            this.renderer.setLevel(def.tubeShapes);
            this.session.load(def, snapshot);
            this.overlay.hide();
            this.toast.announce(`第 ${level} 關，${def.colorCount} 種顏色，${def.tubeCount} 支試管`);
            this.prefetchLevel(level + 1);
            if (this.session.isSolved) this.showWin(false);
        } catch (err) {
            if (token !== this.loadToken) return;
            console.error(`第 ${level} 關載入失敗:`, err);
            this.overlay.showError(err instanceof Error ? err.message : String(err), () => this.loadLevel(level, snapshot));
        }
    }
    /**
     * 點選試管：未持有則拿起；持有時嘗試倒入；不合法則搖晃並改為拿起被點的試管
     * @param {number} id
     */
    async handleTube(id) {
        const r = this.renderer;
        if (r.isBusy) {
            if (this.inputQueue.length < 4) this.inputQueue.push(id);
            return;
        }
        if (this.session.isSolved) return;
        const board = this.session.board;
        const selected = r.selectedId;
        if (selected === null) {
            if (board[id].length === 0) {
                r.shake(id);
                this.sound.playError();
                return;
            }
            r.selectedId = id;
            this.sound.playSelect();
            vibrate(10);
            return;
        }
        if (selected === id) {
            r.selectedId = null;
            this.sound.playClick();
            return;
        }
        const srcBefore = [...board[selected]];
        const tgtBefore = [...board[id]];
        const result = this.session.pour(selected, id);
        if (!result.ok) {
            r.shake(id);
            this.sound.playError();
            vibrate(40);
            const message = POUR_REJECT_MESSAGES[result.reason];
            if (message) this.toast.show(message, { tone: 'warn', durationMs: 1600 });
            r.selectedId = board[id].length > 0 ? id : null;
            return;
        }
        r.selectedId = null;
        r.clearHint();
        this.sound.playPour();
        vibrate([15, 30, 15]);
        await r.playPour(result.move, srcBefore, tgtBefore);
        if (isTubeComplete(this.session.board[id], this.session.capacity)) {
            r.flashSeal(id);
            this.sound.playSeal();
        }
        this.toast.announce(`從第 ${result.move.from + 1} 管倒 ${result.move.amount} 格到第 ${result.move.to + 1} 管`);
        this.afterMove();
        this.drainInputQueue();
    }
    drainInputQueue() {
        while (this.inputQueue.length > 0 && !this.renderer.isBusy && !this.session.isSolved) {
            this.handleTube(this.inputQueue.shift());
        }
        if (this.session.isSolved) this.inputQueue = [];
    }
    afterMove() {
        if (this.session.isSolved) {
            this.showWin(true);
        } else if (this.session.isStuck) {
            this.toast.show('沒有可以走的步了，試試復原或重置', { tone: 'warn', durationMs: 3600 });
        }
    }
    /**
     * @param {boolean} celebrate - 剛完成時播放慶祝；讀檔時直接顯示結果
     */
    showWin(celebrate) {
        const s = this.session;
        const result = {
            level: s.level,
            moves: s.moves,
            optimal: s.optimalSteps,
            timeMs: s.stopwatch.elapsedMs,
            hints: s.hintsUsed,
            rank: s.rank,
            record: updateRecord(this.profile, s.level, { moves: s.moves, timeMs: Math.round(s.stopwatch.elapsedMs) })
        };
        this.persist();
        if (!celebrate) {
            this.win.open(result);
            return;
        }
        this.sound.playWin();
        vibrate([40, 60, 40, 60, 90]);
        this.renderer.celebrate();
        setTimeout(() => this.win.open(result), this.renderer.reducedMotion ? 0 : 650);
    }
    restart() {
        this.inputQueue = [];
        this.renderer.selectedId = null;
        this.renderer.clearHint();
        this.session.restart();
    }
    /**
     * @param {import('./ui/input.js').InputAction} action
     */
    handleAction(action) {
        const r = this.renderer;
        switch (action) {
            case 'undo':
            case 'redo': {
                if (r.isBusy) return;
                const move = action === 'undo' ? this.session.undo() : this.session.redo();
                if (move) {
                    r.selectedId = null;
                    r.clearHint();
                    this.sound.playClick();
                    if (action === 'redo') this.afterMove();
                } else {
                    this.sound.playError();
                }
                return;
            }
            case 'restart':
                if (r.isBusy || (this.session.moves === 0 && !this.session.canRedo)) return;
                this.restart();
                this.sound.playClick();
                this.toast.show('已重置本關');
                return;
            case 'hint':
                this.requestHint();
                return;
            case 'colorBlind':
                this.profile.settings.colorBlind = !this.profile.settings.colorBlind;
                this.hud.renderSettings(this.profile.settings);
                this.persist();
                this.sound.playClick();
                this.toast.show(this.profile.settings.colorBlind ? '已顯示色盲符號' : '已隱藏色盲符號');
                return;
            case 'sound':
                this.profile.settings.sound = !this.profile.settings.sound;
                this.sound.setEnabled(this.profile.settings.sound);
                this.hud.renderSettings(this.profile.settings);
                this.persist();
                this.sound.playClick();
                return;
            case 'help':
                this.help.toggle();
                return;
            case 'cancel':
                r.selectedId = null;
                r.showFocus = false;
                return;
            default:
                throw new Error(`未知的操作: ${action}`);
        }
    }
    async requestHint() {
        const s = this.session;
        if (this.renderer.isBusy || s.isSolved || this.hintPending) return;
        const version = s.version;
        this.hintPending = true;
        this.hud.setHintBusy(true);
        try {
            const res = await this.solver.request('SOLVE_HINT', { board: s.board, capacity: s.capacity }, WORKER_POLICY.hintTimeoutMs);
            if (version !== s.version) return; // 等待期間盤面已變動，結果作廢
            if (res.move) {
                this.renderer.selectedId = null;
                this.renderer.showHint(res.move);
                s.recordHintUsed();
                this.sound.playHint();
                this.toast.announce(`提示：從第 ${res.move.from + 1} 管倒到第 ${res.move.to + 1} 管，還需 ${res.remainingSteps} 步`);
            } else if (res.status === 'unsolvable') {
                this.toast.show('目前的盤面已經無解，請復原幾步', { tone: 'warn', durationMs: 3600 });
                this.sound.playError();
            } else {
                this.toast.show('盤面太複雜，暫時算不出提示', { tone: 'warn' });
            }
        } catch (err) {
            console.warn('提示計算失敗:', err);
            this.toast.show('提示計算失敗，請再試一次', { tone: 'warn' });
        } finally {
            this.hintPending = false;
            this.hud.setHintBusy(false);
        }
    }
}
new App().init();
