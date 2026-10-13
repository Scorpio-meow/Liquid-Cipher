/**
 * 液體解鎖 (Liquid Cipher) 背景運算客戶端
 * 以 requestId 對應 Worker 回應；逾時即終止並重建 Worker。
 * 環境無法建立 Worker 時，改於主執行緒執行同一份任務表。
 */
import { runTask } from '../core/tasks.js';
export class SolverClient {
    /**
     * @param {(() => Worker)|null} createWorker - 無法使用 Worker 時傳入 null
     */
    constructor(createWorker) {
        this.createWorker = createWorker;
        /** @type {Worker|null} */
        this.worker = null;
        /** @type {Map<number, { resolve: Function, reject: Function, timer: number }>} */
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
    /**
     * @param {number} id
     * @param {boolean} ok
     * @param {any} value
     */
    settle(id, ok, value) {
        const entry = this.pending.get(id);
        if (!entry) return;
        this.pending.delete(id);
        clearTimeout(entry.timer);
        if (ok) entry.resolve(value); else entry.reject(value);
    }
    /**
     * 終止目前 Worker 並讓所有等待中的請求失敗
     * @param {Error} reason
     */
    discardWorker(reason) {
        if (this.worker) this.worker.terminate();
        this.worker = null;
        for (const id of [...this.pending.keys()]) {
            this.settle(id, false, reason);
        }
    }
    /**
     * @param {string} type
     * @param {any} payload
     * @param {number} timeoutMs
     * @returns {Promise<any>}
     */
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
