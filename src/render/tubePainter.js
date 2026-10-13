/**
 * 液體解鎖 (Liquid Cipher) 單支試管繪製
 * 座標系：原點為瓶口中心，管身向下延伸 height；呼叫端負責平移與旋轉。
 */
import { defineTubePath, mouthWidth } from './shapes.js';
import { usableHeight } from './layout.js';
import { getAccessibleTextColor, getReagentGlyph, getReagentRgbaStr } from '../core/color.js';
/**
 * @typedef {Object} LiquidBand - 連續同色液柱（單位數可為小數，用於傾倒動畫）
 * @property {string} colorId
 * @property {number} units
 */
/**
 * @typedef {Object} TubePaintState
 * @property {'idle'|'hover'|'selected'|'hint-from'|'hint-to'} emphasis
 * @property {boolean} complete
 * @property {number} seal - 0 ~ 1 完成封蓋閃光強度
 * @property {boolean} colorBlind
 */
/**
 * 盤面試管陣列 → 合併相鄰同色的液柱
 * @param {string[]} layers
 * @returns {LiquidBand[]}
 */
export function toBands(layers) {
    /** @type {LiquidBand[]} */
    const bands = [];
    for (const c of layers) {
        const last = bands[bands.length - 1];
        if (last && last.colorId === c) last.units++;
        else bands.push({ colorId: c, units: 1 });
    }
    return bands;
}
/**
 * 色盲模式形狀符號
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} glyph
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 */
export function drawGlyph(ctx, glyph, cx, cy, r) {
    ctx.beginPath();
    const poly = (pts) => {
        pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(cx + px * r, cy + py * r) : ctx.lineTo(cx + px * r, cy + py * r)));
        ctx.closePath();
    };
    switch (glyph) {
        case 'circle':
            ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
            ctx.fill();
            return;
        case 'triangle':
            poly([[0, -0.95], [0.9, 0.7], [-0.9, 0.7]]);
            ctx.fill();
            return;
        case 'square':
            ctx.rect(cx - r * 0.72, cy - r * 0.72, r * 1.44, r * 1.44);
            ctx.fill();
            return;
        case 'diamond':
            poly([[0, -1], [0.8, 0], [0, 1], [-0.8, 0]]);
            ctx.fill();
            return;
        case 'star': {
            const pts = [];
            for (let i = 0; i < 10; i++) {
                const a = -Math.PI / 2 + (i * Math.PI) / 5;
                const rr = i % 2 === 0 ? 1 : 0.45;
                pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
            }
            poly(pts);
            ctx.fill();
            return;
        }
        case 'plus':
            ctx.rect(cx - r * 0.28, cy - r * 0.85, r * 0.56, r * 1.7);
            ctx.rect(cx - r * 0.85, cy - r * 0.28, r * 1.7, r * 0.56);
            ctx.fill();
            return;
        case 'hexagon': {
            const pts = [];
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3;
                pts.push([Math.cos(a) * 0.85, Math.sin(a) * 0.85]);
            }
            poly(pts);
            ctx.fill();
            return;
        }
        case 'ring':
            ctx.lineWidth = r * 0.36;
            ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
            ctx.stroke();
            return;
        case 'cross':
            ctx.lineWidth = r * 0.42;
            ctx.lineCap = 'round';
            ctx.moveTo(cx - r * 0.65, cy - r * 0.65);
            ctx.lineTo(cx + r * 0.65, cy + r * 0.65);
            ctx.moveTo(cx + r * 0.65, cy - r * 0.65);
            ctx.lineTo(cx - r * 0.65, cy + r * 0.65);
            ctx.stroke();
            return;
        case 'bar':
            ctx.rect(cx - r * 0.9, cy - r * 0.3, r * 1.8, r * 0.6);
            ctx.fill();
            return;
        case 'chevron':
            ctx.lineWidth = r * 0.4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(cx - r * 0.75, cy + r * 0.35);
            ctx.lineTo(cx, cy - r * 0.4);
            ctx.lineTo(cx + r * 0.75, cy + r * 0.35);
            ctx.stroke();
            return;
        case 'moon':
            ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
            ctx.arc(cx + r * 0.45, cy - r * 0.2, r * 0.62, 0, Math.PI * 2);
            ctx.fill('evenodd');
            return;
        default:
            throw new Error(`未知的符號: ${glyph}`);
    }
}
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {string} shape
 * @param {LiquidBand[]} bands
 * @param {number} capacity
 * @param {TubePaintState} state
 */
function paintLiquid(ctx, w, h, shape, bands, capacity, state) {
    const segH = usableHeight(h) / capacity;
    ctx.save();
    defineTubePath(ctx, 0, h, w - 3, h - 1.5, shape);
    ctx.clip();
    ctx.fillStyle = 'rgba(214, 232, 226, 0.035)';
    ctx.fillRect(-w, 0, w * 2, h);
    let filled = 0;
    bands.forEach((band, i) => {
        if (band.units <= 0) return;
        const bottom = h - filled * segH;
        const top = h - (filled + band.units) * segH;
        ctx.fillStyle = getReagentRgbaStr(band.colorId, 1);
        ctx.fillRect(-w, top, w * 2, bottom - top + 0.6);
        if (i === bands.length - 1) {
            // 液面：一道亮邊模擬彎月面
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.fillRect(-w, top, w * 2, Math.max(1.5, segH * 0.07));
        }
        if (state.colorBlind) {
            const ink = getAccessibleTextColor(band.colorId) === '#FFFFFF' ? 'rgba(255,255,255,0.88)' : 'rgba(12,18,16,0.78)';
            ctx.fillStyle = ink;
            ctx.strokeStyle = ink;
            const r = Math.min(w * 0.17, segH * 0.26);
            const whole = Math.floor(band.units + 1e-6);
            for (let u = 0; u < whole; u++) {
                const cy = h - (filled + u + 0.5) * segH;
                ctx.save();
                drawGlyph(ctx, getReagentGlyph(band.colorId), 0, cy, r);
                ctx.restore();
            }
        }
        filled += band.units;
    });
    // 圓柱體光影：左亮右暗
    const shade = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
    shade.addColorStop(0.35, 'rgba(255, 255, 255, 0.0)');
    shade.addColorStop(0.75, 'rgba(0, 0, 0, 0.0)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = shade;
    ctx.fillRect(-w, h - filled * segH, w * 2, filled * segH);
    ctx.restore();
}
/**
 * 繪製試管（不含底座陰影與編號）
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ width: number, height: number, shape: string }} tube
 * @param {LiquidBand[]} bands
 * @param {number} capacity
 * @param {TubePaintState} state
 * @param {{ accent: string, glass: string, glassStrong: string }} palette
 */
export function paintTube(ctx, tube, bands, capacity, state, palette) {
    const { width: w, height: h, shape } = tube;
    paintLiquid(ctx, w, h, shape, bands, capacity, state);
    const emphasized = state.emphasis === 'selected' || state.emphasis === 'hint-from' || state.emphasis === 'hint-to';
    ctx.save();
    if (emphasized) {
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = 14;
    }
    ctx.strokeStyle = emphasized ? palette.accent : state.emphasis === 'hover' ? palette.glassStrong : palette.glass;
    ctx.lineWidth = emphasized ? 2 : 1.5;
    if (state.emphasis === 'hint-to') ctx.setLineDash([5, 4]);
    defineTubePath(ctx, 0, h, w, h, shape);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    // 瓶口唇緣
    ctx.lineWidth = emphasized ? 2 : 1.5;
    ctx.beginPath();
    const lipW = mouthWidth(w, shape);
    ctx.ellipse(0, 0, lipW / 2 + 2, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 玻璃反光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const hx = shape === 'cylinder' ? -w / 2 + 5 : -w * 0.12;
    ctx.moveTo(hx, h * 0.08);
    ctx.lineTo(hx, h * (shape === 'cylinder' ? 0.82 : 0.3));
    ctx.stroke();
    ctx.restore();
    if (state.complete && bands.length === 1) {
        paintStopper(ctx, lipW, h, bands[0].colorId, state.seal);
    }
}
/**
 * 完成管的瓶塞
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} lipW
 * @param {number} h
 * @param {string} colorId
 * @param {number} seal
 */
function paintStopper(ctx, lipW, h, colorId, seal) {
    const sw = lipW * 0.78;
    const sh = Math.max(6, h * 0.06);
    ctx.save();
    if (seal > 0) {
        ctx.shadowColor = getReagentRgbaStr(colorId, 0.9);
        ctx.shadowBlur = 24 * seal;
    }
    ctx.fillStyle = getReagentRgbaStr(colorId, 1);
    ctx.beginPath();
    ctx.roundRect(-sw / 2, -sh * 0.75, sw, sh, Math.min(4, sh / 2));
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(-sw / 2, -sh * 0.75 + sh * 0.62, sw, sh * 0.38);
    ctx.restore();
}
