export function mouthWidth(w, shape) {
    if (shape === 'erlenmeyer') return w * 0.56;
    if (shape === 'bulb') return w * 0.5;
    return w;
}
export function defineTubePath(ctx, x, y, w, h, shape) {
    const hw = w / 2;
    ctx.beginPath();
    switch (shape) {
        case 'cylinder': {
            const r = hw * 0.9;
            ctx.moveTo(x - hw, y - h);
            ctx.lineTo(x - hw, y - r);
            ctx.arcTo(x - hw, y, x, y, r);
            ctx.arcTo(x + hw, y, x + hw, y - r, r);
            ctx.lineTo(x + hw, y - h);
            return;
        }
        case 'erlenmeyer': {
            const neck = mouthWidth(w, shape) / 2;
            const neckH = h * 0.26;
            const r = w * 0.2;
            ctx.moveTo(x - neck, y - h);
            ctx.lineTo(x - neck, y - h + neckH);
            ctx.lineTo(x - hw, y - r);
            ctx.arcTo(x - hw, y, x, y, r);
            ctx.arcTo(x + hw, y, x + hw, y - r, r);
            ctx.lineTo(x + neck, y - h + neckH);
            ctx.lineTo(x + neck, y - h);
            return;
        }
        case 'bulb': {
            const neck = mouthWidth(w, shape) / 2;
            const neckH = h * 0.35;
            ctx.moveTo(x - neck, y - h);
            ctx.lineTo(x - neck, y - h + neckH);
            ctx.bezierCurveTo(x - hw * 1.25, y - h + neckH + h * 0.08, x - hw * 1.12, y, x, y);
            ctx.bezierCurveTo(x + hw * 1.12, y, x + hw * 1.25, y - h + neckH + h * 0.08, x + neck, y - h + neckH);
            ctx.lineTo(x + neck, y - h);
            return;
        }
        case 'funnel': {
            const stem = w * 0.24;
            const coneH = h * 0.42;
            ctx.moveTo(x - hw, y - h);
            ctx.lineTo(x - stem, y - h + coneH);
            ctx.lineTo(x - stem, y - stem);
            ctx.arcTo(x - stem, y, x, y, stem);
            ctx.arcTo(x + stem, y, x + stem, y - stem, stem);
            ctx.lineTo(x + stem, y - h + coneH);
            ctx.lineTo(x + hw, y - h);
            return;
        }
        case 'hourglass': {
            const waist = w * 0.22;
            const waistY = y - h * 0.5;
            const r = w * 0.3;
            ctx.moveTo(x - hw, y - h);
            ctx.lineTo(x - waist, waistY);
            ctx.lineTo(x - hw * 0.9, y - r);
            ctx.arcTo(x - hw * 0.9, y, x, y, r);
            ctx.arcTo(x + hw * 0.9, y, x + hw * 0.9, y - r, r);
            ctx.lineTo(x + waist, waistY);
            ctx.lineTo(x + hw, y - h);
            return;
        }
        default:
            throw new Error(`未知的試管造型: ${shape}`);
    }
}