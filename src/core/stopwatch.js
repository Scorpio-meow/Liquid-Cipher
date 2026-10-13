/**
 * 液體解鎖 (Liquid Cipher) 無漂移碼表
 * 以時間戳差值累計，可暫停/續跑；時間來源可注入以利測試。
 */
export class Stopwatch {
    /**
     * @param {() => number} now
     */
    constructor(now) {
        this.now = now;
        this.accumulatedMs = 0;
        /** @type {number|null} */
        this.startedAt = null;
    }
    get running() {
        return this.startedAt !== null;
    }
    /** @returns {number} */
    get elapsedMs() {
        return this.accumulatedMs + (this.startedAt === null ? 0 : this.now() - this.startedAt);
    }
    start() {
        if (this.startedAt === null) this.startedAt = this.now();
    }
    pause() {
        if (this.startedAt === null) return;
        this.accumulatedMs += this.now() - this.startedAt;
        this.startedAt = null;
    }
    /**
     * @param {number} [ms=0]
     */
    reset(ms = 0) {
        this.accumulatedMs = ms;
        this.startedAt = null;
    }
}
