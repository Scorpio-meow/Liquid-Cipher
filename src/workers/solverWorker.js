/**
 * 液體解鎖 (Liquid Cipher) 背景求解與關卡生成 Web Worker
 * 隔離高成本運算，確保主執行緒與 Canvas 渲染不卡頓。
 */
import { runTask } from '../core/tasks.js';
self.onmessage = (e) => {
    const { type, requestId, payload } = e.data;
    try {
        self.postMessage({ requestId, ok: true, result: runTask(type, payload) });
    } catch (err) {
        self.postMessage({ requestId, ok: false, error: err.message || 'Worker 內部運算異常' });
    }
};
