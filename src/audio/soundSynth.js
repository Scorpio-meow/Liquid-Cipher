/**
 * 液體解鎖 (Liquid Cipher) Web Audio API 程序化即時音效合成器
 * 無外部音檔依賴，即時合成點擊、試管選取、流體注入、錯誤震動、提示音與通關和弦。
 */
export class SoundSynth {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;
        this.enabled = true;
    }
    /**
     * 初始化 AudioContext（必須由使用者互動事件觸發以符合瀏覽器自動播放政策）
     */
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    /**
     * 輕脆介面按鈕點擊聲
     */
    playClick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }
    /**
     * 試管選取/懸浮升起音效 (玻璃共振音)
     */
    playSelect() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }
    /**
     * 液體傾倒注入流動音效 (程序化水滴氣泡連發)
     * @param {number} [durationMs=450]
     */
    playPour(durationMs = 450) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const drops = 6;
        const step = (durationMs / 1000) / drops;
        for (let i = 0; i < drops; i++) {
            const time = now + i * step;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const baseFreq = 320 + Math.random() * 120 + i * 40;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, time);
            osc.frequency.exponentialRampToValueAtTime(baseFreq + 280, time + 0.06);
            gain.gain.setValueAtTime(0.08, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.06);
        }
    }
    /**
     * 非法移動或無效操作錯誤音 (低頻阻尼震動)
     */
    playError() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
    }
    /**
     * 智能提示觸發音效 (空靈雙音)
     */
    playHint() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [587.33, 880.00]; // D5, A5
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const time = now + idx * 0.09;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.4);
        });
    }
    /**
     * 單支試管完成封蓋（短促上行雙音）
     */
    playSeal() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [659.25, 987.77].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const time = now + idx * 0.07;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.25);
        });
    }
    /**
     * 關卡完美解密通關大和弦 (C大調九和弦琶音與延音)
     */
    playWin() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // C4, E4, G4, B4, D5, E5
        const freqs = [261.63, 329.63, 392.00, 493.88, 587.33, 659.25];
        freqs.forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const time = now + idx * 0.1;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, time);
            gain.gain.setValueAtTime(0.0, time);
            gain.gain.linearRampToValueAtTime(0.15, time + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 1.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 1.4);
        });
    }
    /**
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}