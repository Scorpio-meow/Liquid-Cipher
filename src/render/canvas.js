/**
 * 液體解鎖 (Liquid Cipher) High-DPI Canvas 與視圖排版模組
 */

import { RENDER_CONFIG } from '../core/constants.js';

export class CanvasManager {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        /** @type {CanvasRenderingContext2D} */
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        this.logicalWidth = 860;
        this.logicalHeight = 480;

        /** @type {Array<{ id: number, x: number, y: number, width: number, height: number, row: number, shape: string }>} */
        this.tubeLayouts = [];
    }

    /**
     * 調整畫布以適配高解析度視網膜螢幕
     * @param {number} containerWidth
     * @param {number} [maxHeight=520]
     */
    resize(containerWidth, maxHeight = 520) {
        this.dpr = window.devicePixelRatio || 1;

        // 計算邏輯尺寸
        this.logicalWidth = Math.max(340, Math.min(1000, containerWidth - 16));
        this.logicalHeight = Math.max(380, Math.min(maxHeight, window.innerHeight * 0.56));

        // 設置物理像素尺寸與 CSS 樣式尺寸
        this.canvas.width = Math.round(this.logicalWidth * this.dpr);
        this.canvas.height = Math.round(this.logicalHeight * this.dpr);
        this.canvas.style.width = `${this.logicalWidth}px`;
        this.canvas.style.height = `${this.logicalHeight}px`;

        // 重設 Context 縮放
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);
    }

    /**
     * 依據試管數量與造型計算自適應佈局 (單排或雙排)
     * @param {number} tubeCount
     * @param {string[]} tubeShapes
     */
    computeLayout(tubeCount, tubeShapes) {
        this.tubeLayouts = [];
        if (tubeCount === 0) return;

        const isDoubleRow = tubeCount > 7;

        if (!isDoubleRow) {
            // 單排排版
            const tubeW = Math.max(48, Math.min(RENDER_CONFIG.tubeWidth, (this.logicalWidth - 60) / (tubeCount * 1.35)));
            const tubeH = Math.max(150, Math.min(RENDER_CONFIG.tubeHeight, this.logicalHeight * 0.55));
            const spacing = Math.min(RENDER_CONFIG.tubeSpacingMax, (this.logicalWidth - 60) / tubeCount);
            const totalRowW = (tubeCount - 1) * spacing;
            const startX = (this.logicalWidth - totalRowW) / 2;
            const baseY = this.logicalHeight * 0.76;

            for (let i = 0; i < tubeCount; i++) {
                this.tubeLayouts.push({
                    id: i,
                    x: startX + i * spacing,
                    y: baseY,
                    width: tubeW,
                    height: tubeH,
                    row: 0,
                    shape: tubeShapes[i] || 'cylinder'
                });
            }
        } else {
            // 雙排排版 (上下兩層)
            const row1Count = Math.ceil(tubeCount / 2);
            const row2Count = Math.floor(tubeCount / 2);

            const tubeW = Math.max(42, Math.min(54, (this.logicalWidth - 60) / (row1Count * 1.35)));
            const tubeH = Math.max(120, Math.min(150, this.logicalHeight * 0.38));

            const spacing1 = Math.min(95, (this.logicalWidth - 60) / row1Count);
            const totalW1 = (row1Count - 1) * spacing1;
            const startX1 = (this.logicalWidth - totalW1) / 2;
            const baseY1 = this.logicalHeight * 0.44;

            const spacing2 = Math.min(95, (this.logicalWidth - 60) / row2Count);
            const totalW2 = (row2Count - 1) * spacing2;
            const startX2 = (this.logicalWidth - totalW2) / 2;
            const baseY2 = this.logicalHeight * 0.90;

            for (let i = 0; i < row1Count; i++) {
                this.tubeLayouts.push({
                    id: i,
                    x: startX1 + i * spacing1,
                    y: baseY1,
                    width: tubeW,
                    height: tubeH,
                    row: 0,
                    shape: tubeShapes[i] || 'cylinder'
                });
            }

            for (let i = 0; i < row2Count; i++) {
                const idx = row1Count + i;
                this.tubeLayouts.push({
                    id: idx,
                    x: startX2 + i * spacing2,
                    y: baseY2,
                    width: tubeW,
                    height: tubeH,
                    row: 1,
                    shape: tubeShapes[idx] || 'cylinder'
                });
            }
        }
    }

    /**
     * 點擊/觸控座標碰撞檢測
     * @param {number} clientX
     * @param {number} clientY
     * @returns {number|null} 點擊之試管索引，未擊中回傳 null
     */
    hitTest(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.logicalWidth / rect.width;
        const scaleY = this.logicalHeight / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        for (const t of this.tubeLayouts) {
            const left = t.x - t.width / 2 - 14;
            const right = t.x + t.width / 2 + 14;
            const top = t.y - t.height - 18;
            const bottom = t.y + 16;

            if (x >= left && x <= right && y >= top && y <= bottom) {
                return t.id;
            }
        }

        return null;
    }
}
