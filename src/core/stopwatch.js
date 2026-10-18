export class Stopwatch {
    constructor(now) {
        this.now = now;
        this.accumulatedMs = 0;
        this.startedAt = null;
    }
    get running() {
        return this.startedAt !== null;
    }
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
    reset(ms = 0) {
        this.accumulatedMs = ms;
        this.startedAt = null;
    }
}