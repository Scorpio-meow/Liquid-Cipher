export function cloneBoard(board) {
    return board.map(tube => [...tube]);
}
export function getTopColorBlock(tube) {
    if (tube.length === 0) return { color: '', count: 0 };
    const color = tube[tube.length - 1];
    let count = 0;
    for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) {
        count++;
    }
    return { color, count };
}
export function isTubeComplete(tube, capacity) {
    if (tube.length !== capacity) return false;
    return tube.every(c => c === tube[0]);
}
export function isBoardSolved(board, capacity) {
    return board.every(tube => tube.length === 0 || isTubeComplete(tube, capacity));
}
export function countCompletedTubes(board, capacity) {
    return board.reduce((n, tube) => n + (isTubeComplete(tube, capacity) ? 1 : 0), 0);
}
export function evaluatePour(board, capacity, from, to) {
    if (from === to) return { ok: false, reason: 'same-tube' };
    if (!board[from] || !board[to]) return { ok: false, reason: 'out-of-range' };
    const src = board[from];
    const tgt = board[to];
    if (src.length === 0) return { ok: false, reason: 'source-empty' };
    if (tgt.length >= capacity) return { ok: false, reason: 'target-full' };
    const { color, count } = getTopColorBlock(src);
    if (tgt.length > 0 && tgt[tgt.length - 1] !== color) {
        return { ok: false, reason: 'color-mismatch' };
    }
    const amount = Math.min(count, capacity - tgt.length);
    return { ok: true, move: { from, to, amount, colorId: color } };
}
export function applyMoveInPlace(board, move) {
    for (let i = 0; i < move.amount; i++) {
        board[move.to].push(board[move.from].pop());
    }
}
export function revertMoveInPlace(board, move) {
    for (let i = 0; i < move.amount; i++) {
        board[move.from].push(board[move.to].pop());
    }
}
export function applyMove(board, move) {
    const next = cloneBoard(board);
    applyMoveInPlace(next, move);
    return next;
}
export function hasAnyLegalMove(board, capacity) {
    for (let from = 0; from < board.length; from++) {
        for (let to = 0; to < board.length; to++) {
            if (evaluatePour(board, capacity, from, to).ok) return true;
        }
    }
    return false;
}
export function serializeBoard(board) {
    return board.map(tube => tube.join(',')).sort().join('|');
}
export function isWellFormedBoard(board, capacity) {
    return Array.isArray(board) && board.every(tube =>
        Array.isArray(tube) && tube.length <= capacity && tube.every(c => typeof c === 'string' && c.length > 0)
    );
}