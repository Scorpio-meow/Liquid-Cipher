import { RENDER_CONFIG } from '../core/constants.js';
import { isTubeComplete } from '../core/board.js';
import { getReagentRgbaStr, getReagentById } from '../core/color.js';
import { computeStageLayout, hitTestLayout } from './layout.js';
import { mouthWidth } from './shapes.js';
import { paintTube, toBands } from './tubePainter.js';
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
function drainBands(bands, units) {
    let left = units;
    for (let i = bands.length - 1; i >= 0 && left > 0; i--) {
        const take = Math.min(bands[i].units, left);
        bands[i].units -= take;
        left -= take;
    }
    return bands.filter(b => b.units > 1e-4);
}
function fillBands(bands, colorId, units) {
    if (units <= 0) return bands;
    const last = bands[bands.length - 1];
    if (last && last.colorId === colorId) last.units += units;
    else bands.push({ colorId, units });
    return bands;
}
export class StageRenderer {
    constructor(canvas, source, options) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.source = source;
        this.reducedMotion = options.reducedMotion;
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
        this.shapes = [];
        this.layout = { tubes: [], lift: 0, segmentHeight: 0 };
        this.selectedId = null;
        this.hoverId = null;
        this.focusId = null;
        this.showFocus = false;
        this.hint = null;
        this.lifts = new Map();
        this.shakes = new Map();
        this.seals = new Map();
        this.pour = null;
        this.particles = [];
        this.lastFrame = 0;
        this.palette = this.readPalette();
    }
    readPalette() {
        const css = getComputedStyle(document.documentElement);
        const v = (name) => css.getPropertyValue(name).trim();
        return {
            accent: v('--accent'),
            glass: v('--glass'),
            glassStrong: v('--glass-strong'),
            label: v('--text-3'),
            floor: v('--floor-shadow'),
            fontMono: v('--font-mono')
        };
    }
    get isBusy() {
        return this.pour !== null;
    }
    resize(width, height) {
        this.dpr = window.devicePixelRatio || 1;
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.relayout();
    }
    setLevel(shapes) {
        this.shapes = shapes;
        this.selectedId = null;
        this.hoverId = null;
        this.focusId = null;
        this.hint = null;
        this.lifts.clear();
        this.shakes.clear();
        this.seals.clear();
        this.relayout();
    }
    relayout() {
        this.layout = computeStageLayout(this.shapes.length, this.shapes, this.width, this.height, this.source.getCapacity());
    }
    hitTest(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        const x = (clientX - rect.left) * (this.width / rect.width);
        const y = (clientY - rect.top) * (this.height / rect.height);
        return hitTestLayout(this.layout, x, y);
    }
    playPour(move, srcBefore, tgtBefore) {
        this.hint = null;
        const duration = this.reducedMotion ? RENDER_CONFIG.pourDurationMs * 0.4 : RENDER_CONFIG.pourDurationMs;
        return new Promise((resolve) => {
            this.pour = { move, srcBefore, tgtBefore, start: performance.now(), duration, resolve };
        });
    }
    shake(id) {
        this.shakes.set(id, performance.now());
    }
    flashSeal(id) {
        this.seals.set(id, performance.now());
    }
    showHint(move) {
        this.hint = { from: move.from, to: move.to, until: performance.now() + RENDER_CONFIG.hintDurationMs };
    }
    clearHint() {
        this.hint = null;
    }
    celebrate() {
        if (this.reducedMotion) return;
        const board = this.source.getBoard();
        const tubes = this.layout.tubes.filter(t => board[t.id] && board[t.id].length > 0);
        const perTube = Math.ceil(RENDER_CONFIG.confettiParticleCount / Math.max(1, tubes.length));
        for (const t of tubes) {
            const color = getReagentById(board[t.id][0]).hex;
            for (let i = 0; i < perTube; i++) {
                const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
                const speed = 3 + Math.random() * 5;
                this.particles.push({
                    x: t.x + (Math.random() - 0.5) * t.width * 0.4,
                    y: t.y - t.height,
                    vx: Math.cos(a) * speed,
                    vy: Math.sin(a) * speed,
                    r: 1.5 + Math.random() * 2.8,
                    color,
                    life: 1
                });
            }
        }
    }
    start() {
        const loop = (now) => {
            try {
                this.frame(now);
            } catch (err) {
                console.error('渲染影格失敗:', err);
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
    frame(now) {
        const dt = Math.min(0.05, (now - (this.lastFrame || now)) / 1000);
        this.lastFrame = now;
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);
        if (this.hint && now > this.hint.until) this.hint = null;
        const board = this.source.getBoard();
        const capacity = this.source.getCapacity();
        const pourState = this.advancePour(now);
        for (const t of this.layout.tubes) this.paintFloor(ctx, t);
        if (this.hint) this.paintHint(ctx, now);
        for (const t of this.layout.tubes) {
            if (pourState && t.id === pourState.move.from) continue;
            this.paintRestingTube(ctx, t, board, capacity, pourState, now, dt);
        }
        if (pourState) this.paintPouring(ctx, pourState, capacity);
        this.paintParticles(ctx, dt);
    }
    advancePour(now) {
        if (!this.pour) return null;
        const p = Math.min(1, (now - this.pour.start) / this.pour.duration);
        const state = { ...this.pour, p };
        if (p >= 1) {
            const { resolve } = this.pour;
            this.pour = null;
            resolve();
        }
        return state;
    }
    paintFloor(ctx, t) {
        ctx.save();
        ctx.fillStyle = this.palette.floor;
        ctx.beginPath();
        ctx.ellipse(t.x, t.y + 2, t.width * 0.42, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        const focused = this.showFocus && this.focusId === t.id;
        ctx.font = `500 11px ${this.palette.fontMono}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ly = t.y + RENDER_CONFIG.labelSpace * 0.62;
        if (focused) {
            ctx.fillStyle = this.palette.accent;
            ctx.beginPath();
            ctx.roundRect(t.x - 11, ly - 8, 22, 16, 5);
            ctx.fill();
            ctx.fillStyle = '#0c1412';
        } else {
            ctx.fillStyle = this.palette.label;
        }
        ctx.fillText(String(t.id + 1), t.x, ly + 0.5);
        ctx.restore();
    }
    emphasisOf(id) {
        if (this.selectedId === id) return 'selected';
        if (this.hint && this.hint.from === id) return 'hint-from';
        if (this.hint && this.hint.to === id) return 'hint-to';
        if (this.hoverId === id) return 'hover';
        return 'idle';
    }
    paintRestingTube(ctx, t, board, capacity, pourState, now, dt) {
        let layers = board[t.id] || [];
        let bands = toBands(layers);
        if (pourState && t.id === pourState.move.to) {
            layers = pourState.tgtBefore;
            bands = fillBands(toBands(layers), pourState.move.colorId, pourState.move.amount * this.flowFraction(pourState.p));
        }
        const targetLift = this.selectedId === t.id ? this.layout.lift : 0;
        const current = this.lifts.get(t.id) || 0;
        const lift = this.reducedMotion ? targetLift : lerp(current, targetLift, Math.min(1, dt * 16));
        this.lifts.set(t.id, lift);
        let shakeX = 0;
        const shakeStart = this.shakes.get(t.id);
        if (shakeStart !== undefined) {
            const k = (now - shakeStart) / RENDER_CONFIG.shakeDurationMs;
            if (k >= 1) this.shakes.delete(t.id);
            else shakeX = Math.sin(k * Math.PI * 6) * (1 - k) * t.width * 0.12;
        }
        let seal = 0;
        const sealStart = this.seals.get(t.id);
        if (sealStart !== undefined) {
            const k = (now - sealStart) / RENDER_CONFIG.sealFlashMs;
            if (k >= 1) this.seals.delete(t.id);
            else seal = 1 - k;
        }
        const complete = !(pourState && t.id === pourState.move.to && pourState.p < 1) && isTubeComplete(board[t.id] || [], capacity);
        ctx.save();
        ctx.translate(t.x + shakeX, t.y - t.height - lift);
        paintTube(ctx, t, bands, capacity, {
            emphasis: this.emphasisOf(t.id),
            complete,
            seal,
            colorBlind: this.source.getColorBlind()
        }, this.palette);
        ctx.restore();
    }
    flowFraction(p) {
        return Math.max(0, Math.min(1, (p - 0.28) / 0.46));
    }
    paintPouring(ctx, ps, capacity) {
        const src = this.layout.tubes[ps.move.from];
        const tgt = this.layout.tubes[ps.move.to];
        if (!src || !tgt) return;
        const dir = tgt.x >= src.x ? 1 : -1;
        const tilt = RENDER_CONFIG.tiltAngleRad;
        const mw = mouthWidth(src.width, src.shape);
        const edgeX = tgt.x - dir * tgt.width * 0.06;
        const edgeY = tgt.y - tgt.height - tgt.height * 0.1;
        const pourPivot = {
            x: edgeX - dir * (mw / 2) * Math.cos(tilt),
            y: edgeY - (mw / 2) * Math.sin(tilt)
        };
        const restPivot = { x: src.x, y: src.y - src.height - this.layout.lift };
        const p = ps.p;
        let k;
        if (p < 0.28) k = easeInOut(p / 0.28);
        else if (p < 0.74) k = 1;
        else k = 1 - easeInOut((p - 0.74) / 0.26);
        const px = lerp(restPivot.x, pourPivot.x, k);
        const py = lerp(restPivot.y, pourPivot.y, k);
        const angle = dir * tilt * k;
        const flow = this.flowFraction(p);
        const bands = drainBands(toBands(ps.srcBefore), ps.move.amount * flow);
        if (p >= 0.28 && p < 0.74) {
            const tgtUnits = ps.tgtBefore.length + ps.move.amount * flow;
            const surfaceY = tgt.y - tgtUnits * this.layout.segmentHeight;
            const taper = Math.min(1, (p - 0.28) / 0.06, (0.74 - p) / 0.06);
            ctx.save();
            ctx.strokeStyle = getReagentRgbaStr(ps.move.colorId, 1);
            ctx.lineCap = 'round';
            ctx.lineWidth = Math.max(2, src.width * 0.13) * taper;
            ctx.beginPath();
            ctx.moveTo(edgeX, edgeY);
            ctx.lineTo(edgeX + dir * 1.5, surfaceY);
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        paintTube(ctx, src, bands, capacity, {
            emphasis: 'selected',
            complete: false,
            seal: 0,
            colorBlind: this.source.getColorBlind()
        }, this.palette);
        ctx.restore();
        this.lifts.set(src.id, this.layout.lift);
    }
    paintHint(ctx, now) {
        const src = this.layout.tubes[this.hint.from];
        const tgt = this.layout.tubes[this.hint.to];
        if (!src || !tgt) return;
        const sx = src.x;
        const sy = src.y - src.height - 12;
        const tx = tgt.x;
        const ty = tgt.y - tgt.height - 12;
        const mx = (sx + tx) / 2;
        const my = Math.min(sy, ty) - Math.max(36, Math.abs(tx - sx) * 0.25);
        ctx.save();
        ctx.strokeStyle = this.palette.accent;
        ctx.fillStyle = this.palette.accent;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 7]);
        ctx.lineDashOffset = this.reducedMotion ? 0 : -now * 0.03;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(mx, my, tx, ty - 6);
        ctx.stroke();
        ctx.setLineDash([]);
        const ang = Math.atan2(ty - 6 - my, tx - mx);
        ctx.translate(tx, ty - 4);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(-9, -5.5);
        ctx.lineTo(-9, 5.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    paintParticles(ctx, dt) {
        if (this.particles.length === 0) return;
        const step = dt * 60;
        ctx.save();
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const q = this.particles[i];
            q.x += q.vx * step;
            q.y += q.vy * step;
            q.vy += 0.16 * step;
            q.life -= 0.012 * step;
            if (q.life <= 0 || q.y > this.height + 20) {
                this.particles.splice(i, 1);
                continue;
            }
            ctx.globalAlpha = Math.min(1, q.life * 1.6);
            ctx.fillStyle = q.color;
            ctx.beginPath();
            ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}