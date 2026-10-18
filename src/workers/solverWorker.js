import { runTask } from '../core/tasks.js';
self.onmessage = (e) => {
    const { type, requestId, payload } = e.data;
    try {
        self.postMessage({ requestId, ok: true, result: runTask(type, payload) });
    } catch (err) {
        self.postMessage({ requestId, ok: false, error: err.message || 'Worker 內部運算異常' });
    }
};