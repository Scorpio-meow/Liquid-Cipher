/**
 * 液體解鎖 (Liquid Cipher) 實驗室幾何玻璃儀器向量路徑定義
 */

/**
 * 繪製特定形狀的試管玻璃外輪廓路徑
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - 中心 X 座標 (基準點為試管底部中心)
 * @param {number} y - 底部 Y 座標
 * @param {number} w - 試管寬度
 * @param {number} h - 試管高度
 * @param {string} shape - 幾何形狀 ('cylinder'|'erlenmeyer'|'bulb'|'funnel'|'hourglass')
 */
export function defineTubePath(ctx, x, y, w, h, shape = 'cylinder') {
    ctx.beginPath();

    if (shape === 'cylinder') {
        const r = Math.min(18, w / 2);
        ctx.moveTo(x - w / 2, y - h);
        ctx.lineTo(x - w / 2, y - r);
        ctx.arcTo(x - w / 2, y, x, y, r);
        ctx.arcTo(x + w / 2, y, x + w / 2, y - r, r);
        ctx.lineTo(x + w / 2, y - h);
    }
    else if (shape === 'erlenmeyer') {
        const neckW = Math.max(14, w * 0.28);
        const neckH = h * 0.26;
        ctx.moveTo(x - neckW, y - h);
        ctx.lineTo(x - neckW, y - h + neckH);
        ctx.lineTo(x - w / 2, y - 14);
        ctx.arcTo(x - w / 2, y, x, y, 14);
        ctx.arcTo(x + w / 2, y, x + w / 2, y - 14, 14);
        ctx.lineTo(x + neckW, y - h + neckH);
        ctx.lineTo(x + neckW, y - h);
    }
    else if (shape === 'bulb') {
        const neckW = Math.max(13, w * 0.24);
        const neckH = h * 0.35;
        ctx.moveTo(x - neckW, y - h);
        ctx.lineTo(x - neckW, y - h + neckH);
        ctx.bezierCurveTo(x - w / 2 - 8, y - h + neckH + 15, x - w / 2 - 4, y, x, y);
        ctx.bezierCurveTo(x + w / 2 + 4, y, x + w / 2 + 8, y - h + neckH + 15, x + neckW, y - h + neckH);
        ctx.lineTo(x + neckW, y - h);
    }
    else if (shape === 'funnel') {
        const stemW = Math.max(12, w * 0.22);
        const coneH = h * 0.45;
        ctx.moveTo(x - w / 2, y - h);
        ctx.lineTo(x - stemW, y - h + coneH);
        ctx.lineTo(x - stemW, y - 10);
        ctx.arcTo(x - stemW, y, x, y, 10);
        ctx.arcTo(x + stemW, y, x + stemW, y - 10, 10);
        ctx.lineTo(x + stemW, y - h + coneH);
        ctx.lineTo(x + w / 2, y - h);
    }
    else if (shape === 'hourglass') {
        const waistW = Math.max(11, w * 0.2);
        const waistY = y - h * 0.5;
        ctx.moveTo(x - w / 2, y - h);
        ctx.lineTo(x - waistW, waistY);
        ctx.lineTo(x - w / 2 + 4, y - 15);
        ctx.arcTo(x - w / 2 + 4, y, x, y, 15);
        ctx.arcTo(x + w / 2 - 4, y, x + w / 2 - 4, y - 15, 15);
        ctx.lineTo(x + waistW, waistY);
        ctx.lineTo(x + w / 2, y - h);
    }
    else {
        // 預設圓柱
        defineTubePath(ctx, x, y, w, h, 'cylinder');
    }
}
