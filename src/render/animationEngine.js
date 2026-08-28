/**
 * 液體解鎖 (Liquid Cipher) 60fps 動畫管線與流體物理引擎
 */
import { drawTubeWithLiquids } from './liquidRenderer.js';
import { getReagentRgbaStr } from '../core/color.js';
import { RENDER_CONFIG } from '../core/constants.js';
export class AnimationEngine {
    /**
     * @param {import('./canvas.js').CanvasManager} canvasManager
     * @param {import('../core/gameState.js').GameState} gameState
     */
    constructor(canvasManager, gameState) {
        this.canvasManager = canvasManager;
        this.gameState = gameState;
        this.ctx = canvasManager.ctx;
        this.selectedTubeId = null;
        this.hoverTubeId = null;
        this.hintMove = null; // { from, to }
        this.animState = {
            isPouring: false,
            sourceId: null,
            targetId: null,
            amount: 0,
            colorId: '',
            startTime: 0,
            duration: RENDER_CONFIG.pourDurationMs,
            initialSourceLayers: [],
            initialTargetLayers: []
        };
        /** @type {Array<{ tubeId: number, x: number, y: number, size: number, vy: number, alpha: number, color: string }>} */
        this.bubbles = [];
        /** @type {Array<{ x: number, y: number, size: number, color: string, vx: number, vy: number, angle: number, va: number, type: string, alpha: number }>} */
        this.confetti = [];
        /** @type {Array<{ x: number, y: number, vx: number, vy: number, color: string, alpha: number, size: number }>} */
        this.splashParticles = [];
        this.isRunning = false;
        this.onPourComplete = null;
    }
    /**
     * 啟動 60fps 動畫循環
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        const loop = (timestamp) => {
            if (!this.isRunning) return;
            try {
                this.renderFrame(timestamp);
            } catch (err) {
                console.error('動畫影格渲染防禦捕獲:', err);
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
    /**
     * 停止動畫循環
     */
    stop() {
        this.isRunning = false;
    }
    /**
     * 觸發通關彩色紙屑與全息星芒粒子
     */
    spawnConfetti() {
        this.confetti = [];
        const w = this.canvasManager.logicalWidth;
        const colors = ['#38BDF8', '#10B981', '#F59E0B', '#A855F7', '#EC4899', '#06B6D4', '#6366F1'];
        for (let i = 0; i < RENDER_CONFIG.confettiParticleCount + 40; i++) {
            const isStar = Math.random() < 0.25;
            this.confetti.push({
                x: Math.random() * w,
                y: -20 - Math.random() * 120,
                size: isStar ? Math.random() * 6 + 4 : Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 6,
                vy: Math.random() * 4.5 + 3,
                angle: Math.random() * 360,
                va: (Math.random() - 0.5) * 14,
                type: isStar ? 'star' : 'ribbon',
                alpha: 1.0
            });
        }
    }
    /**
     * 開始執行試管傾倒動畫
     * @param {number} from
     * @param {number} to
     * @param {number} amount
     * @param {string} colorId
     * @param {Function} onComplete
     */
    startPourAnimation(from, to, amount, colorId, onComplete) {
        this.animState.isPouring = true;
        this.animState.sourceId = from;
        this.animState.targetId = to;
        this.animState.amount = amount;
        this.animState.colorId = colorId;
        this.animState.startTime = performance.now();
        this.animState.initialSourceLayers = [...this.gameState.currentBoard[from]];
        this.animState.initialTargetLayers = [...this.gameState.currentBoard[to]];
        this.onPourComplete = onComplete;
    }
    /**
     * 繪製流動拋物線射流與落點飛濺水花
     * @param {Object} srcLayout
     * @param {Object} tgtLayout
     * @param {number} progress
     */
    drawPourStream(srcLayout, tgtLayout, progress) {
        if (progress <= 0.18 || progress >= 0.82) return;
        const direction = Math.sign(tgtLayout.x - srcLayout.x) || 1;
        const srcLipX = srcLayout.x + direction * (srcLayout.width * 0.45);
        const srcLipY = srcLayout.y - srcLayout.height - RENDER_CONFIG.liftOffsetPx + 8;
        const capacity = this.gameState.currentLevelDef ? this.gameState.currentLevelDef.capacity : 4;
        const tgtUsableH = tgtLayout.height - 24;
        const tgtSegH = tgtUsableH / capacity;
        const tgtCurrentVolume = this.animState.initialTargetLayers.length + (progress - 0.2) / 0.6 * this.animState.amount;
        const tgtSurfY = tgtLayout.y - tgtCurrentVolume * tgtSegH;
        const tgtSurfX = tgtLayout.x;
        this.ctx.save();
        // 射流外層微光光暈
        const glowGrad = this.ctx.createLinearGradient(srcLipX, srcLipY, tgtSurfX, tgtSurfY);
        glowGrad.addColorStop(0, getReagentRgbaStr(this.animState.colorId, 0.4));
        glowGrad.addColorStop(1, getReagentRgbaStr(this.animState.colorId, 0.25));
        this.ctx.strokeStyle = glowGrad;
        this.ctx.lineWidth = 10;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(srcLipX, srcLipY);
        const controlY = Math.min(srcLipY, tgtSurfY) - 36;
        this.ctx.quadraticCurveTo((srcLipX + tgtSurfX) / 2, controlY, tgtSurfX, tgtSurfY);
        this.ctx.stroke();
        // 射流核心本體
        const coreGrad = this.ctx.createLinearGradient(srcLipX, srcLipY, tgtSurfX, tgtSurfY);
        coreGrad.addColorStop(0, getReagentRgbaStr(this.animState.colorId, 0.98));
        coreGrad.addColorStop(0.7, getReagentRgbaStr(this.animState.colorId, 0.9));
        coreGrad.addColorStop(1, '#ffffff');
        this.ctx.strokeStyle = coreGrad;
        this.ctx.lineWidth = 4.8 + Math.sin(performance.now() * 0.05) * 1.0;
        this.ctx.beginPath();
        this.ctx.moveTo(srcLipX, srcLipY);
        this.ctx.quadraticCurveTo((srcLipX + tgtSurfX) / 2, controlY, tgtSurfX, tgtSurfY);
        this.ctx.stroke();
        // 產生衝擊水花粒子
        if (Math.random() < 0.6) {
            this.splashParticles.push({
                x: tgtSurfX + (Math.random() - 0.5) * 10,
                y: tgtSurfY,
                vx: (Math.random() - 0.5) * 3,
                vy: -(Math.random() * 2.5 + 1.2),
                color: getReagentRgbaStr(this.animState.colorId, 0.8),
                alpha: 1.0,
                size: Math.random() * 2.5 + 1.5
            });
        }
        this.ctx.restore();
    }
    /**
     * 繪製智能提示能量導引弧線 (Hint Energy Beam)
     * @param {Object} srcLayout
     * @param {Object} tgtLayout
     * @param {number} timestamp
     */
    drawHintGuidance(srcLayout, tgtLayout, timestamp) {
        const ctx = this.ctx;
        const sx = srcLayout.x;
        const sy = srcLayout.y - srcLayout.height - 15;
        const tx = tgtLayout.x;
        const ty = tgtLayout.y - tgtLayout.height - 15;
        const midX = (sx + tx) / 2;
        const peakY = Math.min(sy, ty) - 50;
        ctx.save();
        // 能量導引弧線
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -timestamp * 0.04;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(midX, peakY, tx, ty);
        ctx.stroke();
        // 沿弧線飛行的流動能量光球
        const progress = (timestamp * 0.001) % 1.0;
        const qx = (1 - progress) * (1 - progress) * sx + 2 * (1 - progress) * progress * midX + progress * progress * tx;
        const qy = (1 - progress) * (1 - progress) * sy + 2 * (1 - progress) * progress * peakY + progress * progress * ty;
        ctx.setLineDash([]);
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(qx, qy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // 目標管頂部下箭頭引導指示
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        const arrowBounce = Math.sin(timestamp * 0.008) * 4;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 22 + arrowBounce);
        ctx.lineTo(tx - 6, ty - 32 + arrowBounce);
        ctx.lineTo(tx + 6, ty - 32 + arrowBounce);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    /**
     * 單影格渲染核心
     * @param {number} timestamp
     */
    renderFrame(timestamp) {
        const ctx = this.ctx;
        const w = this.canvasManager.logicalWidth;
        const h = this.canvasManager.logicalHeight;
        // 1. 清空畫布並繪製科技環境微網格
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        // 底部基座台架水平微光金屬導軌線
        const layouts = this.canvasManager.tubeLayouts;
        if (layouts.length > 0) {
            const baseY = layouts[0].y + 6;
            const railGrad = ctx.createLinearGradient(40, 0, w - 40, 0);
            railGrad.addColorStop(0, 'transparent');
            railGrad.addColorStop(0.2, 'rgba(56, 189, 248, 0.2)');
            railGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.2)');
            railGrad.addColorStop(1, 'transparent');
            ctx.strokeStyle = railGrad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(30, baseY);
            ctx.lineTo(w - 30, baseY);
            ctx.stroke();
            // 若為雙排，繪製第二排導軌
            const row2 = layouts.find(l => l.row === 1);
            if (row2) {
                const baseY2 = row2.y + 6;
                ctx.beginPath();
                ctx.moveTo(30, baseY2);
                ctx.lineTo(w - 30, baseY2);
                ctx.stroke();
            }
        }
        ctx.restore();
        // 2. 更新與清理氣泡
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.y += b.vy;
            b.alpha -= 0.008;
            if (b.alpha <= 0) {
                this.bubbles.splice(i, 1);
            }
        }
        // 更新與清理水花粒子
        for (let i = this.splashParticles.length - 1; i >= 0; i--) {
            const p = this.splashParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // 重力
            p.alpha -= 0.035;
            if (p.alpha <= 0) {
                this.splashParticles.splice(i, 1);
            } else {
                ctx.save();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        // 3. 計算傾倒動畫階段
        let pourProgress = 0;
        if (this.animState.isPouring) {
            const elapsed = performance.now() - this.animState.startTime;
            pourProgress = Math.min(1.0, elapsed / this.animState.duration);
            if (pourProgress >= 1.0) {
                this.animState.isPouring = false;
                if (this.onPourComplete) {
                    const cb = this.onPourComplete;
                    this.onPourComplete = null;
                    cb();
                }
            }
        }
        const capacity = this.gameState.currentLevelDef ? this.gameState.currentLevelDef.capacity : 4;
        // 4. 若有提示動作，繪製導引能量弧線
        if (this.hintMove && !this.animState.isPouring) {
            const src = layouts.find(l => l.id === this.hintMove.from);
            const tgt = layouts.find(l => l.id === this.hintMove.to);
            if (src && tgt) {
                this.drawHintGuidance(src, tgt, timestamp);
            }
        }
        // 5. 繪製所有試管與液體
        layouts.forEach(layout => {
            const tubeId = layout.id;
            let layersToDraw = this.gameState.currentBoard[tubeId] || [];
            let offsetY = 0;
            let angle = 0;
            if (this.selectedTubeId === tubeId && !this.animState.isPouring) {
                offsetY = -RENDER_CONFIG.liftOffsetPx;
            }
            if (this.animState.isPouring) {
                if (tubeId === this.animState.sourceId) {
                    const tgtLayout = layouts.find(l => l.id === this.animState.targetId);
                    const direction = tgtLayout ? Math.sign(tgtLayout.x - layout.x) || 1 : 1;
                    if (pourProgress <= 0.2) {
                        const p = pourProgress / 0.2;
                        offsetY = -RENDER_CONFIG.liftOffsetPx * p;
                        angle = p * RENDER_CONFIG.tiltAngleRad * direction;
                    } else if (pourProgress <= 0.8) {
                        offsetY = -RENDER_CONFIG.liftOffsetPx;
                        angle = RENDER_CONFIG.tiltAngleRad * direction;
                        // 隨機產生目標管內部微氣泡
                        if (Math.random() < 0.35) {
                            this.bubbles.push({
                                tubeId: this.animState.targetId,
                                x: (Math.random() - 0.5) * 18,
                                y: -Math.random() * 45 - 10,
                                size: Math.random() * 2.4 + 1.2,
                                vy: -(Math.random() * 0.6 + 0.35),
                                alpha: 0.9,
                                color: getReagentRgbaStr(this.animState.colorId, 0.6)
                            });
                        }
                    } else {
                        const p = (1.0 - pourProgress) / 0.2;
                        offsetY = -RENDER_CONFIG.liftOffsetPx * p;
                        angle = p * RENDER_CONFIG.tiltAngleRad * direction;
                    }
                    // 動態計算來源管液體減少
                    const dec = (Math.max(0, Math.min(1, (pourProgress - 0.2) / 0.6))) * this.animState.amount;
                    const temp = [...this.animState.initialSourceLayers];
                    for (let i = 0; i < Math.floor(dec); i++) {
                        temp.pop();
                    }
                    layersToDraw = temp;
                } else if (tubeId === this.animState.targetId) {
                    // 動態計算目標管液體增加
                    const inc = (Math.max(0, Math.min(1, (pourProgress - 0.2) / 0.6))) * this.animState.amount;
                    const temp = [...this.animState.initialTargetLayers];
                    for (let i = 0; i < Math.floor(inc); i++) {
                        temp.push(this.animState.colorId);
                    }
                    layersToDraw = temp;
                }
            }
            const state = {
                isSelected: this.selectedTubeId === tubeId,
                isHovered: this.hoverTubeId === tubeId,
                isHintFrom: this.hintMove && this.hintMove.from === tubeId,
                isHintTo: this.hintMove && this.hintMove.to === tubeId,
                colorBlindMode: this.gameState.colorBlindMode,
                offsetY,
                angle,
                time: timestamp
            };
            const tubeBubbles = this.bubbles.filter(b => b.tubeId === tubeId);
            drawTubeWithLiquids(ctx, layout, layersToDraw, capacity, state, tubeBubbles);
        });
        // 6. 繪製傾倒射流
        if (this.animState.isPouring) {
            const srcLayout = layouts.find(l => l.id === this.animState.sourceId);
            const tgtLayout = layouts.find(l => l.id === this.animState.targetId);
            if (srcLayout && tgtLayout) {
                this.drawPourStream(srcLayout, tgtLayout, pourProgress);
            }
        }
        // 7. 更新與繪製通關星芒與彩色紙屑粒子
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.x += c.vx;
            c.y += c.vy;
            c.angle += c.va;
            ctx.save();
            ctx.fillStyle = c.color;
            ctx.translate(c.x, c.y);
            ctx.rotate((c.angle * Math.PI) / 180);
            if (c.type === 'star') {
                ctx.shadowColor = c.color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(0, -c.size);
                ctx.lineTo(c.size * 0.3, -c.size * 0.3);
                ctx.lineTo(c.size, 0);
                ctx.lineTo(c.size * 0.3, c.size * 0.3);
                ctx.lineTo(0, c.size);
                ctx.lineTo(-c.size * 0.3, c.size * 0.3);
                ctx.lineTo(-c.size, 0);
                ctx.lineTo(-c.size * 0.3, -c.size * 0.3);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.7);
            }
            ctx.restore();
            if (c.y > h + 40) {
                this.confetti.splice(i, 1);
            }
        }
    }
}