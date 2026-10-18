import { formatDuration } from './hud.js';
const RANK_TITLES = {
    S: '最少步數完成，一步不差',
    A: '很接近最少步數',
    B: '分離完成',
    none: '分離完成'
};
function byId(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`缺少介面元素 #${id}`);
    return el;
}
export class WinDialog {
    constructor(handlers) {
        this.dialog = (byId('win-dialog'));
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
        this.dialog = (byId('help-dialog'));
        byId('btn-close-help').addEventListener('click', () => this.close());
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