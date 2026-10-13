/**
 * 液體解鎖 (Liquid Cipher) 對話框
 * 使用原生 <dialog>：焦點圈限、Esc 與背景互動由瀏覽器處理。
 */
import { formatDuration } from './hud.js';
const RANK_TITLES = {
    S: '最少步數完成，一步不差',
    A: '很接近最少步數',
    B: '分離完成',
    none: '分離完成'
};
/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`缺少介面元素 #${id}`);
    return el;
}
export class WinDialog {
    /**
     * @param {{ onNext: () => void, onReplay: () => void }} handlers
     */
    constructor(handlers) {
        this.dialog = /** @type {HTMLDialogElement} */ (byId('win-dialog'));
        this.el = {
            rank: byId('win-rank'),
            eyebrow: byId('win-eyebrow'),
            title: byId('win-title'),
            moves: byId('win-moves'),
            par: byId('win-par'),
            time: byId('win-time'),
            hints: byId('win-hints'),
            note: byId('win-note')
        };
        byId('btn-next').addEventListener('click', () => {
            this.close();
            handlers.onNext();
        });
        byId('btn-replay').addEventListener('click', () => {
            this.close();
            handlers.onReplay();
        });
        // 通關後必須選擇下一步，不允許 Esc 關閉留在已完成盤面
        this.dialog.addEventListener('cancel', (e) => e.preventDefault());
        this.dialog.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.close();
                handlers.onReplay();
            }
        });
    }
    get isOpen() {
        return this.dialog.open;
    }
    /**
     * @param {{ level: number, moves: number, optimal: number|null, timeMs: number, hints: number, rank: 'S'|'A'|'B'|null, record: { previous: { moves: number, timeMs: number }|null, isRecord: boolean } }} result
     */
    open(result) {
        const rankKey = result.rank ?? 'none';
        this.el.rank.dataset.rank = rankKey;
        this.el.rank.textContent = result.rank ?? '✓';
        this.el.eyebrow.textContent = `第 ${result.level} 關完成`;
        this.el.title.textContent = RANK_TITLES[rankKey];
        this.el.moves.textContent = String(result.moves);
        this.el.par.textContent = result.optimal === null ? '—' : String(result.optimal);
        this.el.time.textContent = formatDuration(result.timeMs);
        this.el.hints.textContent = String(result.hints);
        const { previous, isRecord } = result.record;
        if (previous && isRecord) {
            this.el.note.textContent = `新紀錄，之前最佳 ${previous.moves} 步 · ${formatDuration(previous.timeMs)}`;
        } else if (previous) {
            this.el.note.textContent = `本關最佳 ${previous.moves} 步 · ${formatDuration(previous.timeMs)}`;
        } else {
            this.el.note.textContent = '';
        }
        this.el.note.classList.toggle('is-record', !!previous && isRecord);
        this.el.note.hidden = this.el.note.textContent === '';
        this.dialog.showModal();
    }
    close() {
        if (this.dialog.open) this.dialog.close();
    }
}
export class HelpDialog {
    constructor() {
        this.dialog = /** @type {HTMLDialogElement} */ (byId('help-dialog'));
        byId('btn-close-help').addEventListener('click', () => this.close());
        // 點擊背景關閉
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) this.close();
        });
    }
    get isOpen() {
        return this.dialog.open;
    }
    open() {
        if (!this.dialog.open) this.dialog.showModal();
    }
    close() {
        if (this.dialog.open) this.dialog.close();
    }
    toggle() {
        if (this.dialog.open) this.close(); else this.open();
    }
}
