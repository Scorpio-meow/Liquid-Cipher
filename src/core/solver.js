/**
 * 液體解鎖 (Liquid Cipher) 狀態空間搜尋求解器
 * 包含完整最優性證明 Exact Solver (BFS) 與輕量即時提示 Bounded Solver。
 */
/**
 * 檢查盤面是否處於通關目標狀態 (所有試管皆為空或裝滿單一色)
 * @param {string[][]} board - 盤面狀態
 * @param {number} capacity - 單管容量
 * @returns {boolean}
 */
export function isBoardSolved(board, capacity) {
    for (let i = 0; i < board.length; i++) {
        const tube = board[i];
        if (tube.length === 0) continue;
        if (tube.length !== capacity) return false;
        const firstColor = tube[0];
        for (let j = 1; j < tube.length; j++) {
            if (tube[j] !== firstColor) return false;
        }
    }
    return true;
}
/**
 * 產生盤面的規範化（Canonical）唯一字串鍵值，利用試管排列不變性消除對稱狀態
 * @param {string[][]} board
 * @returns {string}
 */
export function serializeBoard(board) {
    const tubeStrings = board.map(tube => tube.join(','));
    tubeStrings.sort();
    return tubeStrings.join('|');
}
/**
 * 複製盤面資料
 * @param {string[][]} board
 * @returns {string[][]}
 */
export function cloneBoard(board) {
    return board.map(tube => [...tube]);
}
/**
 * 計算試管頂部連續同色色塊的數量
 * @param {string[]} tube
 * @returns {{ color: string, count: number }}
 */
export function getTopColorBlock(tube) {
    if (tube.length === 0) return { color: '', count: 0 };
    const color = tube[tube.length - 1];
    let count = 0;
    for (let i = tube.length - 1; i >= 0; i--) {
        if (tube[i] === color) {
            count++;
        } else {
            break;
        }
    }
    return { color, count };
}
/**
 * 檢查單一試管是否已為完全裝滿的單色試管（完成態）
 * @param {string[]} tube
 * @param {number} capacity
 * @returns {boolean}
 */
export function isTubeComplete(tube, capacity) {
    if (tube.length !== capacity) return false;
    const c = tube[0];
    for (let i = 1; i < tube.length; i++) {
        if (tube[i] !== c) return false;
    }
    return true;
}
/**
 * 計算指定盤面下的所有合法移動動作
 * @param {string[][]} board
 * @param {number} capacity
 * @returns {Array<{ from: number, to: number, amount: number, colorId: string }>}
 */
export function getValidMoves(board, capacity) {
    const moves = [];
    const numTubes = board.length;
    for (let from = 0; from < numTubes; from++) {
        const srcTube = board[from];
        if (srcTube.length === 0) continue;
        // 若來源試管已是滿管純色，不再移出
        if (isTubeComplete(srcTube, capacity)) continue;
        const { color: srcColor, count: srcBlockCount } = getTopColorBlock(srcTube);
        // 若來源管內所有顏色都相同（且不是滿管），且要倒到空管，是無效的對稱移動
        const isSrcMonochromatic = srcBlockCount === srcTube.length;
        let seenEmptyTarget = false;
        for (let to = 0; to < numTubes; to++) {
            if (from === to) continue;
            const tgtTube = board[to];
            if (tgtTube.length === capacity) continue; // 目標管已滿
            if (tgtTube.length === 0) {
                // 如果目標管為空管
                if (isSrcMonochromatic) {
                    // 純色管倒入空管無實質進展，忽略
                    continue;
                }
                if (seenEmptyTarget) {
                    // 只向第一個空管倒，避免探索多個空管的對稱分支
                    continue;
                }
                seenEmptyTarget = true;
                const amount = Math.min(srcBlockCount, capacity);
                moves.push({ from, to, amount, colorId: srcColor });
            } else {
                // 目標管非空，檢查頂部顏色是否相同
                const tgtTopColor = tgtTube[tgtTube.length - 1];
                if (tgtTopColor === srcColor) {
                    const availableSpace = capacity - tgtTube.length;
                    const amount = Math.min(srcBlockCount, availableSpace);
                    if (amount > 0) {
                        moves.push({ from, to, amount, colorId: srcColor });
                    }
                }
            }
        }
    }
    return moves;
}
/**
 * 執行倒水動作並回傳新盤面
 * @param {string[][]} board
 * @param {import('./types.js').MoveAction} move
 * @returns {string[][]}
 */
export function applyMove(board, move) {
    const nextBoard = cloneBoard(board);
    const { from, to, amount } = move;
    for (let i = 0; i < amount; i++) {
        const item = nextBoard[from].pop();
        nextBoard[to].push(item);
    }
    return nextBoard;
}
/**
 * Exact Solver: 採用廣度優先搜尋 (BFS)，具有無權重圖最短路徑數學保證
 * @param {string[][]} initialBoard - 初始盤面
 * @param {number} capacity - 單管容量
 * @param {import('./constants.js').EXACT_SOLVER_POLICY} policy - 運算政策
 * @returns {import('./types.js').SolverResult}
 */
export function solveExact(initialBoard, capacity, policy) {
    const startTime = Date.now();
    if (isBoardSolved(initialBoard, capacity)) {
        return {
            status: 'solved',
            optimalityProven: true,
            steps: 0,
            path: [],
            exploredNodes: 1,
            elapsedMs: Date.now() - startTime
        };
    }
    const startKey = serializeBoard(initialBoard);
    const visited = new Set([startKey]);
    // 隊列項目: { board, path, depth }
    let queue = [{
        board: initialBoard,
        path: [],
        depth: 0
    }];
    let head = 0;
    let exploredNodes = 0;
    while (head < queue.length) {
        const current = queue[head++];
        exploredNodes++;
        // 定期截斷已訪問的隊列前端以釋放記憶體
        if (head > 8000) {
            queue = queue.slice(head);
            head = 0;
        }
        if (exploredNodes > policy.maxNodesPerAttempt) {
            return {
                status: 'node_limit_exceeded',
                optimalityProven: false,
                steps: -1,
                path: [],
                exploredNodes,
                elapsedMs: Date.now() - startTime
            };
        }
        if (current.depth >= policy.maxDepth) {
            continue;
        }
        const validMoves = getValidMoves(current.board, capacity);
        for (const move of validMoves) {
            const nextBoard = applyMove(current.board, move);
            if (isBoardSolved(nextBoard, capacity)) {
                const finalPath = [...current.path, move];
                return {
                    status: 'solved',
                    optimalityProven: true, // BFS 首次抵達必為最短解
                    steps: finalPath.length,
                    path: finalPath,
                    exploredNodes,
                    elapsedMs: Date.now() - startTime
                };
            }
            const nextKey = serializeBoard(nextBoard);
            if (!visited.has(nextKey)) {
                visited.add(nextKey);
                queue.push({
                    board: nextBoard,
                    path: [...current.path, move],
                    depth: current.depth + 1
                });
            }
        }
    }
    return {
        status: 'unsolvable',
        optimalityProven: false,
        steps: -1,
        path: [],
        exploredNodes,
        elapsedMs: Date.now() - startTime
    };
}
/**
 * Bounded Hint Solver: 快速啟發式搜尋，提供遊戲中即時提示
 * @param {string[][]} currentBoard
 * @param {number} capacity
 * @param {{ maxNodes?: number, maxDepth?: number }} [options]
 * @returns {import('./types.js').MoveAction|null}
 */
export function solveBoundedHint(currentBoard, capacity, options = {}) {
    const maxNodes = options.maxNodes || 15000;
    const maxDepth = options.maxDepth || 60;
    const res = solveExact(currentBoard, capacity, {
        maxNodesPerAttempt: maxNodes,
        maxDepth,
        maxAttempts: 1,
        uiWatchdogMs: 1000
    });
    if (res.status === 'solved' && res.path.length > 0) {
        return res.path[0];
    }
    return null;
}