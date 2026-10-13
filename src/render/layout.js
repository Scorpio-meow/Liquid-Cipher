/**
 * 液體解鎖 (Liquid Cipher) 自適應試管排版
 * 純函式：依舞台尺寸在 1 ~ maxRows 排之間挑出讓試管最大的排法，並以格子切分畫面供點擊判定。
 */
import { RENDER_CONFIG } from '../core/constants.js';
/**
 * @typedef {Object} TubeLayout
 * @property {number} id
 * @property {number} x - 管底中心 X
 * @property {number} y - 管底 Y
 * @property {number} width
 * @property {number} height
 * @property {number} row
 * @property {string} shape
 * @property {{ left: number, right: number, top: number, bottom: number }} cell - 點擊熱區
 */
/**
 * @typedef {Object} StageLayout
 * @property {TubeLayout[]} tubes
 * @property {number} lift - 選取升起距離
 * @property {number} segmentHeight - 單格液體高度
 */
/**
 * 將 n 支試管分成 rows 排，前面的排數量較多（相差至多 1）
 * @param {number} n
 * @param {number} rows
 * @returns {number[]}
 */
export function splitRows(n, rows) {
    const base = Math.floor(n / rows);
    const extra = n % rows;
    return Array.from({ length: rows }, (_, r) => base + (r < extra ? 1 : 0));
}
/**
 * 液體可用高度（扣除瓶口留白）
 * @param {number} tubeHeight
 * @returns {number}
 */
export function usableHeight(tubeHeight) {
    return tubeHeight * 0.9;
}
/**
 * @param {number} count
 * @param {string[]} shapes
 * @param {number} width - 舞台邏輯寬
 * @param {number} height - 舞台邏輯高
 * @param {number} capacity
 * @returns {StageLayout}
 */
export function computeStageLayout(count, shapes, width, height, capacity) {
    const cfg = RENDER_CONFIG;
    if (count === 0 || width <= 0 || height <= 0) {
        return { tubes: [], lift: 0, segmentHeight: 0 };
    }
    // 每排垂直需求：升起空間 + 管身 + 編號區；管身 = 寬 × aspect
    const verticalFactor = cfg.tubeAspect * (1 + cfg.liftRatio) + 0.25;
    let best = { rows: 1, tubeW: 0 };
    for (let rows = 1; rows <= Math.min(cfg.maxRows, count); rows++) {
        const cols = Math.ceil(count / rows);
        const byWidth = (width / cols) * cfg.cellFill;
        const byHeight = (height / rows - cfg.labelSpace) / verticalFactor;
        const tubeW = Math.min(cfg.tubeMaxWidth, byWidth, byHeight);
        if (tubeW > best.tubeW + 0.5) best = { rows, tubeW };
    }
    const tubeW = Math.max(cfg.tubeMinWidth, best.tubeW);
    const tubeH = tubeW * cfg.tubeAspect;
    const lift = tubeH * cfg.liftRatio;
    const rowH = Math.min(height / best.rows, tubeH * (1 + cfg.liftRatio) + tubeW * 0.25 + cfg.labelSpace + tubeW * 0.9);
    const blockTop = (height - rowH * best.rows) / 2;
    const rowCounts = splitRows(count, best.rows);
    const maxCols = rowCounts[0];
    const spacing = Math.min(width / maxCols, tubeW * 2.3);
    /** @type {TubeLayout[]} */
    const tubes = [];
    let id = 0;
    rowCounts.forEach((n, row) => {
        const rowTop = blockTop + row * rowH;
        // 管底位置：整排內容（升起空間 + 管身 + 編號）於列高中垂直置中
        const content = lift + tubeW * 0.25 + tubeH + cfg.labelSpace;
        const baseY = rowTop + (rowH - content) / 2 + lift + tubeW * 0.25 + tubeH;
        const startX = width / 2 - ((n - 1) * spacing) / 2;
        for (let i = 0; i < n; i++, id++) {
            const x = startX + i * spacing;
            tubes.push({
                id,
                x,
                y: baseY,
                width: tubeW,
                height: tubeH,
                row,
                shape: shapes[id],
                cell: { left: x - spacing / 2, right: x + spacing / 2, top: rowTop, bottom: rowTop + rowH }
            });
        }
    });
    return { tubes, lift, segmentHeight: usableHeight(tubeH) / capacity };
}
/**
 * 點擊判定：先找包含該點的格子；落在格子外（舞台邊緣）時吸附到同排最近的試管
 * @param {StageLayout} layout
 * @param {number} x
 * @param {number} y
 * @returns {number|null}
 */
export function hitTestLayout(layout, x, y) {
    for (const t of layout.tubes) {
        const c = t.cell;
        if (x >= c.left && x < c.right && y >= c.top && y < c.bottom) return t.id;
    }
    let nearest = null;
    let bestDist = Infinity;
    for (const t of layout.tubes) {
        const c = t.cell;
        if (y < c.top || y >= c.bottom) continue;
        const d = Math.abs(x - t.x);
        if (d < bestDist && d <= (c.right - c.left)) {
            bestDist = d;
            nearest = t.id;
        }
    }
    return nearest;
}
