/**
 * 液體解鎖 (Liquid Cipher) 背景求解與關卡生成 Web Worker
 * 隔離高成本運算，確保瀏覽器主執行緒與 Canvas 渲染絕不卡頓。
 */
import { generateLevel } from '../core/generator.js';
import { solveExact, solveBoundedHint } from '../core/solver.js';
self.onmessage = function (e) {
    const { type, requestId, payload } = e.data;
    try {
        switch (type) {
            case 'GENERATE_LEVEL': {
                const { level, policy } = payload;
                const levelDef = generateLevel(level, policy);
                self.postMessage({
                    type: 'LEVEL_GENERATED',
                    requestId,
                    success: true,
                    result: levelDef
                });
                break;
            }
            case 'SOLVE_EXACT': {
                const { board, capacity, policy } = payload;
                const solveResult = solveExact(board, capacity, policy);
                self.postMessage({
                    type: 'EXACT_SOLVE_RESULT',
                    requestId,
                    success: true,
                    result: solveResult
                });
                break;
            }
            case 'SOLVE_HINT': {
                const { board, capacity, options } = payload;
                const hintMove = solveBoundedHint(board, capacity, options);
                self.postMessage({
                    type: 'HINT_RESULT',
                    requestId,
                    success: true,
                    result: hintMove
                });
                break;
            }
            default:
                self.postMessage({
                    type: 'ERROR',
                    requestId,
                    success: false,
                    error: `未知的 Worker 操作類型: ${type}`
                });
        }
    } catch (err) {
        self.postMessage({
            type: 'ERROR',
            requestId,
            success: false,
            error: err.message || 'Worker 內部運算異常'
        });
    }
};