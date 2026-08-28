/**
 * 液體解鎖 (Liquid Cipher) 流體分層、半月板表面張力與玻璃管渲染模組
 */

import { defineTubePath } from './shapes.js';
import { getReagentById, getReagentRgbaStr, getAccessibleTextColor, getColorBlindSymbol } from '../core/color.js';
import { RENDER_CONFIG } from '../core/constants.js';

/**
 * 繪製單支試管及其內部液體、氣泡與玻璃高光
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} layout - 試管座標幾何 { id, x, y, width, height, shape }
 * @param {string[]} layers - 該管內液體陣列 (底至頂)
 * @param {number} capacity - 單管容量上限
 * @param {Object} state - 互動與渲染狀態 { isSelected, isHovered, isHintFrom, isHintTo, colorBlindMode, offsetY, angle, time }
 * @param {Array<{ x: number, y: number, size: number, color: string }>} bubbles - 該管內部氣泡
 */
export function drawTubeWithLiquids(ctx, layout, layers, capacity, state, bubbles = []) {
    const { x, y, width, height, shape } = layout;
    const { isSelected, isHovered, isHintFrom, isHintTo, colorBlindMode, offsetY = 0, angle = 0, time = 0 } = state;

    ctx.save();

    // 0. 繪製底部實驗室置管台座與投影光環 (在原位繪製，不隨試管升起旋轉)
    ctx.save();
    ctx.translate(x, y + 6);
    const pedestalW = width * 0.85;
    
    // 底部基座陰影
    const shadowGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, pedestalW / 2 + 10);
    shadowGrad.addColorStop(0, 'rgba(2, 6, 23, 0.85)');
    shadowGrad.addColorStop(0.6, 'rgba(2, 6, 23, 0.45)');
    shadowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, pedestalW / 2 + 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 置管台微光金屬刻度環
    ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.65)' : 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, pedestalW / 2, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 若被選中，在底部投射能量光環
    if (isSelected) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 12;
        const ringScale = 1 + Math.sin(time * 0.008) * 0.08;
        ctx.beginPath();
        ctx.ellipse(0, 0, (pedestalW / 2 + 6) * ringScale, 7 * ringScale, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    // 移動畫布至試管中心並處理選取懸浮或傾倒旋轉
    ctx.translate(x, y + offsetY);

    // 若有傾斜旋轉變換 (以試管頂部口緣為旋轉中心)
    if (angle !== 0) {
        ctx.translate(0, -height);
        ctx.rotate(angle);
        ctx.translate(0, height);
    }

    const usableHeight = height - 24;
    const segmentHeight = usableHeight / capacity;

    // 1. 裁剪玻璃內部路徑
    ctx.save();
    defineTubePath(ctx, 0, 0, width - 6, height - 3, shape);
    ctx.clip();

    // 玻璃背景微暗透明層 (增加液體深度)
    ctx.fillStyle = 'rgba(10, 18, 36, 0.35)';
    ctx.fillRect(-width, -height, width * 2, height);

    // 2. 由底至頂繪製液體分層
    let currentY = 0;
    for (let i = 0; i < layers.length; i++) {
        const colorId = layers[i];
        const topY = -currentY - segmentHeight;
        const layerH = segmentHeight;

        // 立體流體漸層 (深色邊緣 + 中央光亮通道)
        const grad = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
        grad.addColorStop(0, getReagentRgbaStr(colorId, 0.82));
        grad.addColorStop(0.25, getReagentRgbaStr(colorId, 0.98));
        grad.addColorStop(0.5, getReagentRgbaStr(colorId, 1.0));
        grad.addColorStop(0.75, getReagentRgbaStr(colorId, 0.96));
        grad.addColorStop(1, getReagentRgbaStr(colorId, 0.82));

        ctx.fillStyle = grad;
        ctx.fillRect(-width, topY, width * 2, layerH + 0.5);

        // 如果是該管頂部液面，繪製表面張力微波紋 (Meniscus)
        if (i === layers.length - 1) {
            const wave = Math.sin(time * 0.005 + x * 0.1) * 1.8;
            ctx.save();
            ctx.fillStyle = getReagentRgbaStr(colorId, 0.55);
            ctx.beginPath();
            ctx.ellipse(0, topY + wave, width / 2 - 4, RENDER_CONFIG.meniscusCurveDepth + 1, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 液面高光反光線
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, topY + wave, width / 2 - 6, RENDER_CONFIG.meniscusCurveDepth * 0.7, 0, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 色盲模式識別符號晶片標籤繪製
        if (colorBlindMode) {
            const symbol = getColorBlindSymbol(colorId);
            const textColor = getAccessibleTextColor(colorId);
            const centerY = topY + layerH / 2;

            ctx.save();
            ctx.font = '700 11px "Share Tech Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 符號背景微光晶片底框
            ctx.fillStyle = 'rgba(4, 8, 20, 0.75)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(-16, centerY - 9, 32, 18, 4);
            ctx.fill();
            ctx.stroke();

            // 符號文字
            ctx.fillStyle = textColor === '#FFFFFF' ? '#F8FAFC' : '#0F172A';
            ctx.fillText(symbol, 0, centerY);
            ctx.restore();
        }

        currentY += segmentHeight;
    }

    // 3. 繪製液體內部上升微氣泡
    for (const b of bubbles) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.restore(); // 解除 clip

    // 4. 繪製玻璃試管外邊框與高光狀態
    ctx.save();

    let strokeStyle = 'rgba(148, 163, 184, 0.28)'; // 預設科技微光
    let lineWidth = 2;
    let shadowColor = 'transparent';
    let shadowBlur = 0;

    if (isSelected) {
        strokeStyle = 'rgba(56, 189, 248, 1.0)';
        lineWidth = 3.5;
        shadowColor = 'rgba(56, 189, 248, 0.8)';
        shadowBlur = 18;
    } else if (isHintFrom) {
        strokeStyle = 'rgba(245, 158, 11, 1.0)';
        lineWidth = 3.5;
        shadowColor = 'rgba(245, 158, 11, 0.85)';
        shadowBlur = 20;
    } else if (isHintTo) {
        strokeStyle = 'rgba(16, 185, 129, 1.0)';
        lineWidth = 3.5;
        shadowColor = 'rgba(16, 185, 129, 0.85)';
        shadowBlur = 20;
    } else if (isHovered) {
        strokeStyle = 'rgba(56, 189, 248, 0.65)';
        lineWidth = 2.5;
        shadowColor = 'rgba(56, 189, 248, 0.4)';
        shadowBlur = 12;
    }

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;

    defineTubePath(ctx, 0, 0, width, height, shape);
    ctx.stroke();

    // 頂部瓶口外緣圓環與厚度
    ctx.shadowBlur = 0;
    ctx.fillStyle = strokeStyle;
    ctx.beginPath();
    ctx.ellipse(0, -height, width / 2 + 3, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 玻璃左側縱向鏡面高光線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 6, -height + 16);
    ctx.lineTo(-width / 2 + 6, -14);
    ctx.stroke();

    // 玻璃右側微弱次級反光線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 6, -height + 20);
    ctx.lineTo(width / 2 - 6, -18);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
}

