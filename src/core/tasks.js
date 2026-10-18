import { generateLevel } from './generator.js';
import { solveHint } from './solver.js';
import { EXACT_SOLVER_POLICY, HINT_SOLVER_POLICY } from './constants.js';
export const TASKS = {
    GENERATE_LEVEL: ({ level }) => generateLevel(level, EXACT_SOLVER_POLICY),
    SOLVE_HINT: ({ board, capacity }) => solveHint(board, capacity, HINT_SOLVER_POLICY)
};
export function runTask(type, payload) {
    if (!Object.hasOwn(TASKS, type) || typeof TASKS[type] !== 'function') {
        throw new Error(`未知的運算任務: ${type}`);
    }
    return TASKS[type](payload);
}