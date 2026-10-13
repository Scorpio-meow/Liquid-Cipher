/**
 * 液體解鎖 (Liquid Cipher) 背景運算任務表
 * Worker 與主執行緒備援共用同一份任務實作，確保兩條路徑結果一致。
 */
import { generateLevel } from './generator.js';
import { solveHint } from './solver.js';
import { EXACT_SOLVER_POLICY, HINT_SOLVER_POLICY } from './constants.js';
export const TASKS = {
    /**
     * @param {{ level: number }} payload
     */
    GENERATE_LEVEL: ({ level }) => generateLevel(level, EXACT_SOLVER_POLICY),
    /**
     * @param {{ board: string[][], capacity: number }} payload
     */
    SOLVE_HINT: ({ board, capacity }) => solveHint(board, capacity, HINT_SOLVER_POLICY)
};
/**
 * @param {string} type
 * @param {any} payload
 * @returns {any}
 */
export function runTask(type, payload) {
    const task = TASKS[type];
    if (!task) throw new Error(`未知的運算任務: ${type}`);
    return task(payload);
}
