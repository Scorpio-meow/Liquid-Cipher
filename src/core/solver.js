import {
    applyMove,
    getTopColorBlock,
    isBoardSolved,
    isTubeComplete,
    serializeBoard
} from './board.js';
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
function tracePath(nodes, index, lastMove) {
    const path = [lastMove];
    for (let i = index; nodes[i].parent !== -1; i = nodes[i].parent) {
        path.push(nodes[i].move);
    }
    return path.reverse();
}
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
    const nodes = [{ board: initialBoard, parent: -1, move: null, depth: 0 }];
    const visited = new Set([serializeBoard(initialBoard)]);
    let depthLimited = false;
    for (let head = 0; head < nodes.length; head++) {
        if (head >= policy.maxNodesPerAttempt) {
            return result('node_limit_exceeded', [], head);
        }
        const current = nodes[head];
        const board = current.board;
        current.board = null;
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
export function solveHint(board, capacity, policy) {
    const res = solveExact(board, capacity, policy);
    return {
        status: res.status,
        move: res.path.length > 0 ? res.path[0] : null,
        remainingSteps: res.steps
    };
}