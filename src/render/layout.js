import { RENDER_CONFIG } from '../core/constants.js';
export function splitRows(n, rows) {
    const base = Math.floor(n / rows);
    const extra = n % rows;
    return Array.from({ length: rows }, (_, r) => base + (r < extra ? 1 : 0));
}
export function usableHeight(tubeHeight) {
    return tubeHeight * 0.9;
}
export function computeStageLayout(count, shapes, width, height, capacity) {
    const cfg = RENDER_CONFIG;
    if (count === 0 || width <= 0 || height <= 0) {
        return { tubes: [], lift: 0, segmentHeight: 0 };
    }
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
    const tubes = [];
    let id = 0;
    rowCounts.forEach((n, row) => {
        const rowTop = blockTop + row * rowH;
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