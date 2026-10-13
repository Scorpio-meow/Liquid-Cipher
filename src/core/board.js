/**
 * 液體解鎖 (Liquid Cipher) 盤面規則模組
 * 純函式：Water Sort 傾倒規則、通關判定與盤面工具，供遊戲狀態、求解器與生成器共用。
 */
/**
 * @param {string[][]} board
 * @returns {string[][]}
 */
export function cloneBoard(board) {
    return board.map(tube => [...tube]);
}
/**
 * 試管頂部連續同色色塊
 * @param {string[]} tube
 * @returns {{ color: string, count: number }}
 */
export function getTopColorBlock(tube) {
    if (tube.length === 0) return { color: '', count: 0 };
    const color = tube[tube.length - 1];
    let count = 0;
    for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) {
        count++;
    }
    return { color, count };
}
/**
 * 單一試管是否已裝滿單一純色
 * @param {string[]} tube
 * @param {number} capacity
 * @returns {boolean}
 */
export function isTubeComplete(tube, capacity) {
    if (tube.length !== capacity) return false;
    return tube.every(c => c === tube[0]);
}
/**
 * 盤面是否通關（每支試管為空或裝滿單一純色）
 * @param {string[][]} board
 * @param {number} capacity
 * @returns {boolean}
 */
export function isBoardSolved(board, capacity) {
    return board.every(tube => tube.length === 0 || isTubeComplete(tube, capacity));
}
/**
 * @param {string[][]} board
 * @param {number} capacity
 * @returns {number}
 */
export function countCompletedTubes(board, capacity) {
    return board.reduce((n, tube) => n + (isTubeComplete(tube, capacity) ? 1 : 0), 0);
}
/**
 * 傾倒不合法原因代碼
 * @typedef {'same-tube'|'out-of-range'|'source-empty'|'target-full'|'color-mismatch'|'level-solved'} PourRejectReason
 */
/**
 * 評估 from → to 的倒水動作
 * @param {string[][]} board
 * @param {number} capacity
 * @param {number} from
 * @param {number} to
 * @returns {{ ok: true, move: import('./types.js').MoveAction } | { ok: false, reason: PourRejectReason }}
 */
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
/**
 * 就地套用移動
 * @param {string[][]} board
 * @param {import('./types.js').MoveAction} move
 */
export function applyMoveInPlace(board, move) {
    for (let i = 0; i < move.amount; i++) {
        board[move.to].push(board[move.from].pop());
    }
}
/**
 * 就地撤銷移動（applyMoveInPlace 的逆運算）
 * @param {string[][]} board
 * @param {import('./types.js').MoveAction} move
 */
export function revertMoveInPlace(board, move) {
    for (let i = 0; i < move.amount; i++) {
        board[move.from].push(board[move.to].pop());
    }
}
/**
 * 套用移動並回傳新盤面
 * @param {string[][]} board
 * @param {import('./types.js').MoveAction} move
 * @returns {string[][]}
 */
export function applyMove(board, move) {
    const next = cloneBoard(board);
    applyMoveInPlace(next, move);
    return next;
}
/**
 * 盤面上是否還存在任何合法倒水動作
 * @param {string[][]} board
 * @param {number} capacity
 * @returns {boolean}
 */
export function hasAnyLegalMove(board, capacity) {
    for (let from = 0; from < board.length; from++) {
        for (let to = 0; to < board.length; to++) {
            if (evaluatePour(board, capacity, from, to).ok) return true;
        }
    }
    return false;
}
/**
 * 規範化盤面鍵值（試管排列不變性，消除對稱狀態）
 * @param {string[][]} board
 * @returns {string}
 */
export function serializeBoard(board) {
    return board.map(tube => tube.join(',')).sort().join('|');
}
/**
 * 檢查資料是否為形狀合法的盤面（用於讀取外部存檔）
 * @param {unknown} board
 * @param {number} capacity
 * @returns {boolean}
 */
export function isWellFormedBoard(board, capacity) {
    return Array.isArray(board) && board.every(tube =>
        Array.isArray(tube) && tube.length <= capacity && tube.every(c => typeof c === 'string' && c.length > 0)
    );
}
