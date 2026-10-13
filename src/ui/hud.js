/**
 * 液體解鎖 (Liquid Cipher) 介面視圖
 * 只負責把狀態寫進 DOM：關卡狀態列、工具列可用性、設定按鈕、舞台遮罩、提示訊息與螢幕閱讀器播報。
 */
/**
 * @param {number} ms
 * @returns {string} m:ss 或 h:mm:ss
 */
export function formatDuration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`缺少介面元素 #${id}`);
    return el;
}
export class HudView {
    constructor() {
        this.el = {
            level: byId('hud-level'),
            spec: byId('hud-spec'),
            moves: byId('hud-moves'),
            par: byId('hud-par'),
            time: byId('hud-time'),
            hints: byId('hud-hints'),
            progress: byId('hud-progress'),
            progressFill: byId('hud-progress-fill'),
            progressLabel: byId('hud-progress-label'),
            undo: byId('btn-undo'),
            redo: byId('btn-redo'),
            hint: byId('btn-hint'),
            restart: byId('btn-restart'),
            colorBlind: byId('btn-colorblind'),
            sound: byId('btn-sound')
        };
    }
    /**
     * @param {import('../core/session.js').GameSession} session
     */
    render(session) {
        const def = session.levelDef;
        if (!def) return;
        const el = this.el;
        el.level.textContent = String(def.level);
        el.spec.textContent = `${def.colorCount} 色 · ${def.tubeCount} 管`;
        el.moves.textContent = String(session.moves);
        el.par.textContent = session.optimalSteps === null ? '—' : String(session.optimalSteps);
        el.moves.parentElement.classList.toggle('is-over', session.optimalSteps !== null && session.moves > session.optimalSteps);
        el.hints.textContent = String(session.hintsUsed);
        const done = session.completedTubes;
        const goal = def.colorCount;
        el.progress.setAttribute('aria-valuemax', String(goal));
        el.progress.setAttribute('aria-valuenow', String(done));
        el.progressFill.style.transform = `scaleX(${goal > 0 ? done / goal : 0})`;
        el.progressLabel.textContent = `${done} / ${goal}`;
        const solved = session.isSolved;
        el.undo.disabled = !session.canUndo || solved;
        el.redo.disabled = !session.canRedo || solved;
        el.restart.disabled = (session.moves === 0 && !session.canRedo) || solved;
        el.hint.disabled = solved;
        this.renderTime(session.stopwatch.elapsedMs);
    }
    /**
     * @param {number} ms
     */
    renderTime(ms) {
        this.el.time.textContent = formatDuration(ms);
    }
    /**
     * @param {{ colorBlind: boolean, sound: boolean }} settings
     */
    renderSettings(settings) {
        this.el.colorBlind.setAttribute('aria-pressed', String(settings.colorBlind));
        this.el.sound.setAttribute('aria-pressed', String(settings.sound));
    }
    /**
     * @param {boolean} busy
     */
    setHintBusy(busy) {
        this.el.hint.classList.toggle('is-busy', busy);
        this.el.hint.setAttribute('aria-busy', String(busy));
    }
}
export class StageOverlay {
    constructor() {
        this.root = byId('stage-overlay');
        this.title = byId('overlay-title');
        this.desc = byId('overlay-desc');
        this.bar = byId('overlay-bar');
        this.retry = byId('btn-retry');
        /** @type {(() => void)|null} */
        this.onRetry = null;
        this.retry.addEventListener('click', () => this.onRetry && this.onRetry());
    }
    get visible() {
        return !this.root.hidden;
    }
    /**
     * @param {number} level
     */
    showLoading(level) {
        this.root.classList.remove('is-error');
        this.title.textContent = `正在準備第 ${level} 關`;
        this.desc.textContent = '求解器正在驗證盤面可解並計算最少步數。';
        this.bar.hidden = false;
        this.retry.hidden = true;
        this.root.hidden = false;
    }
    /**
     * @param {string} message
     * @param {() => void} onRetry
     */
    showError(message, onRetry) {
        this.root.classList.add('is-error');
        this.title.textContent = '關卡載入失敗';
        this.desc.textContent = message;
        this.bar.hidden = true;
        this.retry.hidden = false;
        this.onRetry = onRetry;
        this.root.hidden = false;
        this.retry.focus();
    }
    hide() {
        this.root.hidden = true;
    }
}
export class Toaster {
    constructor() {
        this.region = byId('toast-region');
        this.sr = byId('sr-status');
        this.timer = 0;
    }
    /**
     * @param {string} message
     * @param {{ tone?: 'info'|'warn', durationMs?: number }} [options]
     */
    show(message, options = {}) {
        const { tone = 'info', durationMs = 2400 } = options;
        clearTimeout(this.timer);
        this.region.replaceChildren();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.dataset.tone = tone;
        toast.textContent = message;
        this.region.append(toast);
        this.timer = setTimeout(() => {
            toast.classList.add('is-leaving');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, durationMs);
    }
    /**
     * 只播報給螢幕閱讀器，不顯示
     * @param {string} message
     */
    announce(message) {
        this.sr.textContent = '';
        requestAnimationFrame(() => {
            this.sr.textContent = message;
        });
    }
}
