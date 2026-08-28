/**
 * 液體解鎖 (Liquid Cipher) 介面控制器
 * 負責 DOM 事件綁定、HUD 即時數據同步、高精度碼表計時器、使用者互動、鍵盤快捷鍵與彈窗生命週期。
 */

export class UIController {
    /**
     * @param {import('../core/gameState.js').GameState} gameState
     * @param {import('../render/canvas.js').CanvasManager} canvasManager
     * @param {import('../render/animationEngine.js').AnimationEngine} animationEngine
     * @param {import('../audio/soundSynth.js').SoundSynth} soundSynth
     * @param {Object} appHooks - { onNextLevel, onReplayLevel, onRequestHint }
     */
    constructor(gameState, canvasManager, animationEngine, soundSynth, appHooks) {
        this.gameState = gameState;
        this.canvasManager = canvasManager;
        this.animationEngine = animationEngine;
        this.soundSynth = soundSynth;
        this.appHooks = appHooks;

        this.elements = {
            levelBadge: document.getElementById('hud-level-val'),
            specBadge: document.getElementById('hud-spec-val'),
            ratingPill: document.getElementById('hud-rating-val'),
            optimalSteps: document.getElementById('hud-optimal-val'),
            currentMoves: document.getElementById('hud-moves-val'),
            timer: document.getElementById('hud-timer-val'),
            btnUndo: document.getElementById('btn-undo'),
            btnRedo: document.getElementById('btn-redo'),
            btnRestart: document.getElementById('btn-restart'),
            btnHint: document.getElementById('btn-hint'),
            btnColorBlind: document.getElementById('btn-colorblind'),
            btnSound: document.getElementById('btn-sound'),
            btnHelp: document.getElementById('btn-help'),
            btnMobileUndo: document.getElementById('btn-mobile-undo'),
            btnMobileRedo: document.getElementById('btn-mobile-redo'),
            btnMobileRestart: document.getElementById('btn-mobile-restart'),
            btnMobileHint: document.getElementById('btn-mobile-hint'),
            soundIconOn: document.getElementById('sound-icon-on'),
            soundIconOff: document.getElementById('sound-icon-off'),
            loadingOverlay: document.getElementById('loading-overlay'),
            winModal: document.getElementById('win-modal'),
            modalRatingBadge: document.getElementById('modal-rating-badge'),
            modalMovesVal: document.getElementById('modal-moves-val'),
            modalOptimalVal: document.getElementById('modal-optimal-val'),
            modalTimeVal: document.getElementById('modal-time-val'),
            btnNextLevel: document.getElementById('btn-next-level'),
            btnReplayLevel: document.getElementById('btn-replay-level'),
            helpModal: document.getElementById('help-modal'),
            btnCloseHelp: document.getElementById('btn-close-help'),
            btnAckHelp: document.getElementById('btn-ack-help')
        };

        this.timerInterval = null;
        this.timerStartTime = Date.now();
        this.timerRunning = false;
        this.hintTimeoutId = null;
    }

    /**
     * 初始化事件綁定
     */
    init() {
        this.bindCanvasEvents();
        this.bindButtonEvents();
        this.bindKeyboardShortcuts();
        this.startTimer();
        this.syncUI();
    }

    /**
     * 觸發行動端微觸覺反饋 (Haptic Feedback)
     * @param {number|number[]} pattern
     */
    vibrate(pattern = 15) {
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(pattern);
            }
        } catch (_) {}
    }

    /**
     * 處理試管點擊或快捷鍵選取
     * @param {number} hitId
     */
    handleTubeSelectOrPour(hitId) {
        if (hitId === null || hitId === undefined) {
            this.animationEngine.selectedTubeId = null;
            return;
        }

        if (this.animationEngine.animState.isPouring) return;

        if (this.animationEngine.selectedTubeId === null) {
            const tube = this.gameState.currentBoard[hitId];
            if (tube && tube.length > 0) {
                this.animationEngine.selectedTubeId = hitId;
                this.soundSynth.playSelect();
                this.vibrate(15);
            }
        } else {
            const srcId = this.animationEngine.selectedTubeId;
            if (hitId === srcId) {
                // 再次點擊已選取試管，取消選取
                this.animationEngine.selectedTubeId = null;
                this.soundSynth.playClick();
                this.vibrate(8);
            } else {
                // 嘗試倒水至目標試管
                const check = this.gameState.canPour(srcId, hitId);
                if (check.valid) {
                    this.animationEngine.selectedTubeId = null;
                    this.animationEngine.hintMove = null;
                    this.soundSynth.playPour();
                    this.vibrate([20, 35, 20]);

                    this.animationEngine.startPourAnimation(srcId, hitId, check.amount, check.colorId, () => {
                        this.gameState.executePour(srcId, hitId);
                        this.syncUI();

                        // 檢查是否通關
                        if (this.gameState.isWon()) {
                            this.pauseTimer();
                            this.soundSynth.playWin();
                            this.vibrate([50, 70, 50, 70, 100]);
                            this.animationEngine.spawnConfetti();
                            this.showWinModal();
                        }
                    });
                } else {
                    this.soundSynth.playError();
                    this.vibrate(45);
                    this.animationEngine.selectedTubeId = null;
                }
            }
        }
    }

    /**
     * 綁定 Canvas 滑鼠與觸控事件
     */
    bindCanvasEvents() {
        const canvas = this.canvasManager.canvas;

        const onPointerDown = (clientX, clientY) => {
            if (this.animationEngine.animState.isPouring) return;
            const hitId = this.canvasManager.hitTest(clientX, clientY);
            this.handleTubeSelectOrPour(hitId);
        };

        canvas.addEventListener('mousedown', (e) => {
            onPointerDown(e.clientX, e.clientY);
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.animationEngine.animState.isPouring) return;
            this.animationEngine.hoverTubeId = this.canvasManager.hitTest(e.clientX, e.clientY);
        });

        canvas.addEventListener('mouseleave', () => {
            this.animationEngine.hoverTubeId = null;
        });

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                const t = e.touches[0];
                onPointerDown(t.clientX, t.clientY);
            }
        }, { passive: true });
    }

    /**
     * 綁定控制按鈕群事件
     */
    bindButtonEvents() {
        // 復原 (桌機 & 行動端)
        if (this.elements.btnUndo) {
            this.elements.btnUndo.addEventListener('click', () => {
                this.triggerUndo();
            });
        }
        if (this.elements.btnMobileUndo) {
            this.elements.btnMobileUndo.addEventListener('click', () => {
                this.triggerUndo();
            });
        }

        // 重做 (桌機 & 行動端)
        if (this.elements.btnRedo) {
            this.elements.btnRedo.addEventListener('click', () => {
                this.triggerRedo();
            });
        }
        if (this.elements.btnMobileRedo) {
            this.elements.btnMobileRedo.addEventListener('click', () => {
                this.triggerRedo();
            });
        }

        // 重置本關 (桌機 & 行動端)
        if (this.elements.btnRestart) {
            this.elements.btnRestart.addEventListener('click', () => {
                this.triggerRestart();
            });
        }
        if (this.elements.btnMobileRestart) {
            this.elements.btnMobileRestart.addEventListener('click', () => {
                this.triggerRestart();
            });
        }

        // 智能提示 (桌機 & 行動端)
        if (this.elements.btnHint) {
            this.elements.btnHint.addEventListener('click', () => {
                this.triggerHint();
            });
        }
        if (this.elements.btnMobileHint) {
            this.elements.btnMobileHint.addEventListener('click', () => {
                this.triggerHint();
            });
        }

        // 色盲模式切換
        if (this.elements.btnColorBlind) {
            this.elements.btnColorBlind.addEventListener('click', () => {
                this.triggerColorBlindToggle();
            });
        }

        // 音效切換
        if (this.elements.btnSound) {
            this.elements.btnSound.addEventListener('click', () => {
                this.triggerSoundToggle();
            });
        }

        // 開啟說明協議
        if (this.elements.btnHelp) {
            this.elements.btnHelp.addEventListener('click', () => {
                this.showHelpModal();
            });
        }

        // 關閉說明協議
        if (this.elements.btnCloseHelp) {
            this.elements.btnCloseHelp.addEventListener('click', () => {
                this.hideHelpModal();
            });
        }

        if (this.elements.btnAckHelp) {
            this.elements.btnAckHelp.addEventListener('click', () => {
                this.hideHelpModal();
            });
        }

        // 勝利彈窗 - 下一關
        if (this.elements.btnNextLevel) {
            this.elements.btnNextLevel.addEventListener('click', () => {
                this.soundSynth.playClick();
                this.hideWinModal();
                if (this.appHooks.onNextLevel) {
                    this.appHooks.onNextLevel();
                }
            });
        }

        // 勝利彈窗 - 重玩本關
        if (this.elements.btnReplayLevel) {
            this.elements.btnReplayLevel.addEventListener('click', () => {
                this.soundSynth.playClick();
                this.hideWinModal();
                if (this.appHooks.onReplayLevel) {
                    this.appHooks.onReplayLevel();
                }
            });
        }
    }

    /**
     * 綁定全局鍵盤快捷鍵
     */
    bindKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            // 若目前在勝利彈窗
            if (this.elements.winModal && this.elements.winModal.classList.contains('show')) {
                if (key === 'enter' || key === ' ') {
                    e.preventDefault();
                    this.elements.btnNextLevel.click();
                    return;
                }
                if (key === 'r') {
                    e.preventDefault();
                    this.elements.btnReplayLevel.click();
                    return;
                }
                return;
            }

            // 若在說明彈窗
            if (this.elements.helpModal && this.elements.helpModal.classList.contains('show')) {
                if (key === 'escape' || key === 'enter' || key === ' ') {
                    e.preventDefault();
                    this.hideHelpModal();
                    return;
                }
            }

            // 全局快捷鍵
            if (key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (e.shiftKey) {
                    this.triggerRedo();
                } else {
                    this.triggerUndo();
                }
                return;
            }

            if (key === 'z' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.triggerUndo();
                return;
            }

            if (key === 'y') {
                e.preventDefault();
                this.triggerRedo();
                return;
            }

            if (key === 'r') {
                e.preventDefault();
                this.triggerRestart();
                return;
            }

            if (key === 'h') {
                e.preventDefault();
                this.triggerHint();
                return;
            }

            if (key === 'c') {
                e.preventDefault();
                this.triggerColorBlindToggle();
                return;
            }

            if (key === 'm') {
                e.preventDefault();
                this.triggerSoundToggle();
                return;
            }

            if (key === '?' || key === '/') {
                e.preventDefault();
                if (this.elements.helpModal && this.elements.helpModal.classList.contains('show')) {
                    this.hideHelpModal();
                } else {
                    this.showHelpModal();
                }
                return;
            }

            if (key === 'escape') {
                this.animationEngine.selectedTubeId = null;
                this.hideHelpModal();
                return;
            }

            // 數字鍵 1 ~ 9 快速選管
            const num = parseInt(key, 10);
            if (!isNaN(num) && num >= 1 && num <= 9) {
                const targetIdx = num - 1;
                if (targetIdx < this.gameState.currentBoard.length) {
                    e.preventDefault();
                    this.handleTubeSelectOrPour(targetIdx);
                }
            }
        });
    }

    triggerUndo() {
        if (this.animationEngine.animState.isPouring) return;
        if (this.gameState.undo()) {
            this.soundSynth.playClick();
            this.vibrate(10);
            this.animationEngine.selectedTubeId = null;
            this.animationEngine.hintMove = null;
            this.syncUI();
        } else {
            this.soundSynth.playError();
        }
    }

    triggerRedo() {
        if (this.animationEngine.animState.isPouring) return;
        if (this.gameState.redo()) {
            this.soundSynth.playClick();
            this.vibrate(10);
            this.animationEngine.selectedTubeId = null;
            this.animationEngine.hintMove = null;
            this.syncUI();
        } else {
            this.soundSynth.playError();
        }
    }

    triggerRestart() {
        if (this.animationEngine.animState.isPouring) return;
        this.soundSynth.playClick();
        this.vibrate(15);
        this.gameState.resetCurrentLevel();
        this.resetTimer();
        this.animationEngine.selectedTubeId = null;
        this.animationEngine.hintMove = null;
        this.syncUI();
    }

    triggerHint() {
        if (this.animationEngine.animState.isPouring) return;
        this.soundSynth.playHint();
        this.vibrate([15, 30, 20]);
        if (this.appHooks.onRequestHint) {
            this.appHooks.onRequestHint();
        }
    }

    triggerColorBlindToggle() {
        this.gameState.colorBlindMode = !this.gameState.colorBlindMode;
        this.gameState.persistSaveData();
        this.soundSynth.playClick();
        this.vibrate(10);
        this.syncUI();
    }

    triggerSoundToggle() {
        const enabled = this.soundSynth.toggle();
        this.gameState.soundEnabled = enabled;
        this.gameState.persistSaveData();
        this.syncUI();
    }

    /**
     * 啟動/重啟高精度碼表計時器
     */
    startTimer() {
        this.stopTimer();
        this.timerStartTime = Date.now() - (this.gameState.elapsedMs || 0);
        this.timerRunning = true;
        this.timerInterval = setInterval(() => {
            if (!this.timerRunning) return;
            this.gameState.elapsedMs = Math.max(0, Date.now() - this.timerStartTime);
            this.updateTimerDisplay();
        }, 200);
        this.updateTimerDisplay();
    }

    /**
     * 暫停碼表計時器
     */
    pauseTimer() {
        this.timerRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * 停止計時器
     */
    stopTimer() {
        this.timerRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * 重設計時器並重新從 0 計時
     */
    resetTimer() {
        this.stopTimer();
        this.gameState.elapsedMs = 0;
        this.timerStartTime = Date.now();
        this.updateTimerDisplay();
        this.startTimer();
    }

    /**
     * 更新計時器顯示
     */
    updateTimerDisplay() {
        if (!this.elements.timer) return;
        const totalSec = Math.max(0, Math.floor((this.gameState.elapsedMs || 0) / 1000));
        const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        this.elements.timer.textContent = `${m}:${s}`;
    }

    /**
     * 同步介面數據與按鈕狀態
     */
    syncUI() {
        if (this.elements.levelBadge) {
            this.elements.levelBadge.textContent = `LEVEL ${this.gameState.activeLevel}`;
        }

        if (this.elements.specBadge && this.gameState.currentLevelDef) {
            const def = this.gameState.currentLevelDef;
            const colors = def.colorCount || new Set(def.initialBoard.flat().filter(Boolean)).size;
            const tubes = this.gameState.currentBoard.length || def.initialBoard.length;
            this.elements.specBadge.textContent = `${colors} 色 · ${tubes} 管`;
        }

        const optimal = this.gameState.currentLevelDef ? this.gameState.currentLevelDef.knownOptimalSteps : 0;
        const moves = this.gameState.moveCount;

        if (this.elements.optimalSteps) {
            this.elements.optimalSteps.textContent = optimal > 0 ? String(optimal) : '--';
        }
        if (this.elements.currentMoves) {
            this.elements.currentMoves.textContent = String(moves);
        }

        // 更新效率評級標籤
        if (this.elements.ratingPill) {
            if (moves === 0) {
                this.elements.ratingPill.textContent = 'READY';
                this.elements.ratingPill.classList.remove('over');
            } else if (optimal > 0 && moves <= optimal) {
                this.elements.ratingPill.textContent = 'OPTIMAL';
                this.elements.ratingPill.classList.remove('over');
            } else if (optimal > 0 && moves <= optimal + 3) {
                this.elements.ratingPill.textContent = 'PAR';
                this.elements.ratingPill.classList.remove('over');
            } else {
                this.elements.ratingPill.textContent = `+${moves - optimal}`;
                this.elements.ratingPill.classList.add('over');
            }
        }

        const canUndo = this.gameState.moveHistory.length > 0;
        const canRedo = this.gameState.redoHistory.length > 0;

        if (this.elements.btnUndo) {
            this.elements.btnUndo.disabled = !canUndo;
        }
        if (this.elements.btnMobileUndo) {
            this.elements.btnMobileUndo.disabled = !canUndo;
        }

        if (this.elements.btnRedo) {
            this.elements.btnRedo.disabled = !canRedo;
        }
        if (this.elements.btnMobileRedo) {
            this.elements.btnMobileRedo.disabled = !canRedo;
        }

        if (this.elements.btnColorBlind) {
            this.elements.btnColorBlind.classList.toggle('active', this.gameState.colorBlindMode);
        }

        if (this.elements.soundIconOn && this.elements.soundIconOff) {
            this.elements.soundIconOn.style.display = this.soundSynth.enabled ? 'block' : 'none';
            this.elements.soundIconOff.style.display = this.soundSynth.enabled ? 'none' : 'block';
        }

        this.updateTimerDisplay();
    }

    /**
     * 展現提示動作
     * @param {import('../core/types.js').MoveAction} move
     */
    showHint(move) {
        if (!move) return;
        this.animationEngine.hintMove = move;
        if (this.hintTimeoutId) clearTimeout(this.hintTimeoutId);
        this.hintTimeoutId = setTimeout(() => {
            this.animationEngine.hintMove = null;
        }, 4000);
    }

    /**
     * 顯示加載中遮罩
     */
    showLoading() {
        this.pauseTimer();
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * 隱藏加載中遮罩
     */
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
        this.startTimer();
    }

    /**
     * 展現通關結算彈窗
     */
    showWinModal() {
        if (!this.elements.winModal) return;
        this.pauseTimer();

        const moves = this.gameState.moveCount;
        const optimal = this.gameState.currentLevelDef ? this.gameState.currentLevelDef.knownOptimalSteps : 0;

        if (this.elements.modalMovesVal) {
            this.elements.modalMovesVal.textContent = String(moves);
        }
        if (this.elements.modalOptimalVal) {
            this.elements.modalOptimalVal.textContent = optimal > 0 ? String(optimal) : '--';
        }
        if (this.elements.modalTimeVal) {
            const totalSec = Math.max(0, Math.floor((this.gameState.elapsedMs || 0) / 1000));
            const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
            const s = String(totalSec % 60).padStart(2, '0');
            this.elements.modalTimeVal.textContent = `${m}:${s}`;
        }

        // 計算通關評級
        if (this.elements.modalRatingBadge) {
            if (optimal > 0 && moves <= optimal) {
                this.elements.modalRatingBadge.textContent = 'RANK S // PERFECT';
                this.elements.modalRatingBadge.style.background = 'linear-gradient(135deg, #10b981, #0284c7)';
            } else if (optimal > 0 && moves <= optimal + 3) {
                this.elements.modalRatingBadge.textContent = 'RANK A // EXCELLENT';
                this.elements.modalRatingBadge.style.background = 'linear-gradient(135deg, #38bdf8, #6366f1)';
            } else {
                this.elements.modalRatingBadge.textContent = 'RANK B // SOLVED';
                this.elements.modalRatingBadge.style.background = 'linear-gradient(135deg, #f59e0b, #ea580c)';
            }
        }

        this.elements.winModal.classList.add('show');
    }

    /**
     * 關閉通關結算彈窗
     */
    hideWinModal() {
        if (this.elements.winModal) {
            this.elements.winModal.classList.remove('show');
        }
    }

    /**
     * 展現說明協議彈窗
     */
    showHelpModal() {
        if (this.elements.helpModal) {
            this.elements.helpModal.classList.add('show');
            this.soundSynth.playClick();
        }
    }

    /**
     * 關閉說明協議彈窗
     */
    hideHelpModal() {
        if (this.elements.helpModal) {
            this.elements.helpModal.classList.remove('show');
            this.soundSynth.playClick();
        }
    }
}
