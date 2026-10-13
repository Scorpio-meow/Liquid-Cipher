/**
 * 液體解鎖 (Liquid Cipher) 狀態空間搜尋求解器
 * Exact Solver 以 BFS 證明最短解；路徑以父節點指標回溯，避免每個節點複製整條路徑。
 */
import {
    applyMove,
    getTopColorBlock,
    isBoardSolved,
    isTubeComplete,
    serializeBoard
} from './board.js';
/**
 * 求解用的合法移動（含對稱剪枝）
 * - 已完成的滿管不再移出
 * - 純色管倒入空管沒有進展，略過
 * - 同一來源只探索第一支空管
 * @param {string[][]} board
 * @param {number} capacity
 * @returns {import('./types.js').MoveAction[]}
 */
export function getValidMoves(board, capacity) {
    const moves = [];
    for (let from = 0; from < board.length; from++) {
        const src = board[from];
        if (src.length === 0 || isTubeComplete(src, capacity)) continue;
        const { color, count } = getTopColorBlock(src);
        const isMonochrome = count === src.length;
        let seenEmptyTarget = false;
        for (let to = 0; to < board.length; to++) {
            if (from === to) continue;
            const tgt = board[to];
            if (tgt.length >= capacity) continue;
            if (tgt.length === 0) {
                if (isMonochrome || seenEmptyTarget) continue;
                seenEmptyTarget = true;
                moves.push({ from, to, amount: count, colorId: color });
            } else if (tgt[tgt.length - 1] === color) {
                moves.push({ from, to, amount: Math.min(count, capacity - tgt.length), colorId: color });
            }
        }
    }
    return moves;
}
/**
 * @param {{ parent: number, move: import('./types.js').MoveAction|null }[]} nodes
 * @param {number} index
 * @param {import('./types.js').MoveAction} lastMove
 * @returns {import('./types.js').MoveAction[]}
 */
function tracePath(nodes, index, lastMove) {
    const path = [lastMove];
    for (let i = index; nodes[i].parent !== -1; i = nodes[i].parent) {
        path.push(nodes[i].move);
    }
    return path.reverse();
}
/**
 * Exact Solver：BFS 於無權重圖首次抵達即為最短解
 * @param {string[][]} initialBoard
 * @param {number} capacity
 * @param {{ maxNodesPerAttempt: number, maxDepth: number }} policy
 * @returns {import('./types.js').SolverResult}
 */
export function solveExact(initialBoard, capacity, policy) {
    const startTime = Date.now();
    const result = (status, path, exploredNodes) => ({
        status,
        optimalityProven: status === 'solved',
        steps: status === 'solved' ? path.length : -1,
        path,
        exploredNodes,
        elapsedMs: Date.now() - startTime
    });
    if (isBoardSolved(initialBoard, capacity)) {
        return result('solved', [], 1);
    }
    /** @type {{ board: string[][]|null, parent: number, move: import('./types.js').MoveAction|null, depth: number }[]} */
    const nodes = [{ board: initialBoard, parent: -1, move: null, depth: 0 }];
    const visited = new Set([serializeBoard(initialBoard)]);
    let depthLimited = false;
    for (let head = 0; head < nodes.length; head++) {
        if (head >= policy.maxNodesPerAttempt) {
            return result('node_limit_exceeded', [], head);
        }
        const current = nodes[head];
        const board = current.board;
        current.board = null; // 已展開節點只保留回溯資訊
        if (current.depth >= policy.maxDepth) {
            depthLimited = true;
            continue;
        }
        for (const move of getValidMoves(board, capacity)) {
            const next = applyMove(board, move);
            if (isBoardSolved(next, capacity)) {
                return result('solved', tracePath(nodes, head, move), head + 1);
            }
            const key = serializeBoard(next);
            if (visited.has(key)) continue;
            visited.add(key);
            nodes.push({ board: next, parent: head, move, depth: current.depth + 1 });
        }
    }
    return result(depthLimited ? 'depth_exceeded' : 'unsolvable', [], nodes.length);
}
/**
 * 遊戲中提示：回傳最短解的第一步與求解狀態
 * @param {string[][]} board
 * @param {number} capacity
 * @param {{ maxNodesPerAttempt: number, maxDepth: number }} policy
 * @returns {{ status: import('./types.js').SolverResult['status'], move: import('./types.js').MoveAction|null, remainingSteps: number }}
 */
export function solveHint(board, capacity, policy) {
    const res = solveExact(board, capacity, policy);
    return {
        status: res.status,
        move: res.path.length > 0 ? res.path[0] : null,
        remainingSteps: res.steps
    };
}
