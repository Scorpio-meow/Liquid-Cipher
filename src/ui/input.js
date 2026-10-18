export class InputController {
    constructor(canvas, renderer, getTubeCount, handlers) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.getTubeCount = getTubeCount;
        this.handlers = handlers;
    }
    bind() {
        this.bindPointer();
        this.bindKeyboard();
        this.bindButtons();
    }
    bindPointer() {
        const r = this.renderer;
        this.canvas.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (this.handlers.isBlocked()) return;
            r.showFocus = false;
            const id = r.hitTest(e.clientX, e.clientY);
            if (id === null) {
                this.handlers.onAction('cancel');
                return;
            }
            r.focusId = id;
            this.handlers.onTube(id);
        });
        this.canvas.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'mouse') return;
            r.hoverId = r.hitTest(e.clientX, e.clientY);
        });
        this.canvas.addEventListener('pointerleave', () => {
            r.hoverId = null;
        });
    }
    moveFocus(key) {
        const tubes = this.renderer.layout.tubes;
        if (tubes.length === 0) return;
        const r = this.renderer;
        const current = r.focusId ?? r.selectedId ?? 0;
        if (!r.showFocus) {
            r.showFocus = true;
            r.focusId = current;
            return;
        }
        const n = tubes.length;
        if (key === 'arrowleft') r.focusId = (current - 1 + n) % n;
        else if (key === 'arrowright') r.focusId = (current + 1) % n;
        else {
            const from = tubes[current];
            const row = from.row + (key === 'arrowdown' ? 1 : -1);
            const candidates = tubes.filter(t => t.row === row);
            if (candidates.length === 0) return;
            r.focusId = candidates.reduce((a, b) => (Math.abs(b.x - from.x) < Math.abs(a.x - from.x) ? b : a)).id;
        }
    }
    bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (this.handlers.isBlocked()) return;
            if (e.altKey) return;
            const key = e.key.toLowerCase();
            const mod = e.ctrlKey || e.metaKey;
            if (key === 'z' && mod) {
                e.preventDefault();
                this.handlers.onAction(e.shiftKey ? 'redo' : 'undo');
                return;
            }
            if (mod) return;
            if (key === 'arrowleft' || key === 'arrowright' || key === 'arrowup' || key === 'arrowdown') {
                e.preventDefault();
                this.moveFocus(key);
                return;
            }
            if ((key === 'enter' || key === ' ') && this.renderer.showFocus && this.renderer.focusId !== null) {
                if (document.activeElement instanceof HTMLButtonElement) return;
                e.preventDefault();
                this.handlers.onTube(this.renderer.focusId);
                return;
            }
            if (/^[0-9]$/.test(key)) {
                const id = key === '0' ? 9 : Number(key) - 1;
                if (id < this.getTubeCount()) {
                    e.preventDefault();
                    this.renderer.focusId = id;
                    this.handlers.onTube(id);
                }
                return;
            }
            const map = { z: 'undo', y: 'redo', r: 'restart', h: 'hint', c: 'colorBlind', m: 'sound', '?': 'help', '/': 'help', escape: 'cancel' };
            const action = map[key];
            if (!action) return;
            if (e.repeat && action !== 'undo' && action !== 'redo') return;
            e.preventDefault();
            this.handlers.onAction(action);
        });
    }
    bindButtons() {
        const buttons = [
            ['btn-undo', 'undo'],
            ['btn-redo', 'redo'],
            ['btn-restart', 'restart'],
            ['btn-hint', 'hint'],
            ['btn-colorblind', 'colorBlind'],
            ['btn-sound', 'sound'],
            ['btn-help', 'help']
        ];
        for (const [id, action] of buttons) {
            const el = document.getElementById(id);
            if (!el) throw new Error(`缺少介面元素 #${id}`);
            el.addEventListener('click', () => {
                if (action !== 'help' && this.handlers.isBlocked()) return;
                this.handlers.onAction(action);
            });
        }
    }
}