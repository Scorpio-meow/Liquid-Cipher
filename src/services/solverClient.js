import { runTask } from '../core/tasks.js';
export class SolverClient {
    constructor(createWorker) {
        this.createWorker = createWorker;
        this.worker = null;
        this.pending = new Map();
        this.counter = 0;
        this.spawn();
    }
    spawn() {
        if (!this.createWorker) return;
        try {
            const worker = this.createWorker();
            worker.onmessage = (e) => this.settle(e.data.requestId, e.data.ok, e.data.ok ? e.data.result : new Error(e.data.error));
            worker.onerror = (err) => {
                console.warn('Worker 執行失敗，改用主執行緒運算:', err);
                this.createWorker = null;
                this.discardWorker(new Error('Worker 執行失敗'));
            };
            this.worker = worker;
        } catch (e) {
            console.warn('無法建立 Worker，改用主執行緒運算:', e);
            this.createWorker = null;
            this.worker = null;
        }
    }
    settle(id, ok, value) {
        const entry = this.pending.get(id);
        if (!entry) return;
        this.pending.delete(id);
        clearTimeout(entry.timer);
        if (ok) entry.resolve(value); else entry.reject(value);
    }
    discardWorker(reason) {
        if (this.worker) this.worker.terminate();
        this.worker = null;
        for (const id of [...this.pending.keys()]) {
            this.settle(id, false, reason);
        }
    }
    request(type, payload, timeoutMs) {
        if (!this.worker) {
            return new Promise((resolve, reject) => {
                try {
                    resolve(runTask(type, payload));
                } catch (e) {
                    reject(e);
                }
            });
        }
        const requestId = ++this.counter;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.discardWorker(new Error(`${type} 運算逾時 (${timeoutMs}ms)`));
                this.spawn();
            }, timeoutMs);
            this.pending.set(requestId, { resolve, reject, timer });
            this.worker.postMessage({ type, requestId, payload });
        });
    }
}