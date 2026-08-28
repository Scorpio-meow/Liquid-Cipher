/**
 * 液體解鎖 (Liquid Cipher) 關卡生成管線
 * 實作確定性 32-bit Seed 逆向置亂與發布前三重門禁嚴格驗證。
 */

import { APP_CONFIG, EXACT_SOLVER_POLICY, REAGENTS } from './constants.js';
import { getLevelParams, assignTubeShapes } from './difficulty.js';
import { deriveLevelSeed } from './hash.js';
import { createPRNG } from './prng.js';
import { solveExact, isBoardSolved, cloneBoard } from './solver.js';
import { deriveInfiniteFallbackLevel } from './fallbackLevels.js';

/**
 * 門禁 1: 驗證候選盤面結構合法性
 * @param {string[][]} board
 * @param {import('./types.js').LevelParams} params
 * @returns {boolean}
 */
export function validateBoardStructure(board, params) {
    if (board.length !== params.tubeCount) return false;

    const colorCounts = new Map();
    let emptyCount = 0;

    for (const tube of board) {
        if (tube.length === 0) {
            emptyCount++;
            continue;
        }
        if (tube.length > params.capacity) return false;
        for (const c of tube) {
            colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
        }
    }

    if (emptyCount !== params.emptyTubeCount) return false;
    if (colorCounts.size !== params.colorCount) return false;

    for (const [, count] of colorCounts) {
        if (count !== params.capacity) return false;
    }

    // 不可為已通關狀態
    if (isBoardSolved(board, params.capacity)) return false;

    return true;
}

/**
 * 依據目標狀態與逆向倒水操作置亂盤面
 * @param {import('./types.js').LevelParams} params
 * @param {import('./prng.js').createPRNG} prng
 * @returns {string[][]}
 */
export function generateCandidateBoard(params, prng) {
    const selectedColorIds = REAGENTS.slice(0, params.colorCount).map(r => r.id);

    // 建立所有色塊並進行 Fisher-Yates 隨機打散
    const pool = [];
    for (const id of selectedColorIds) {
        for (let i = 0; i < params.capacity; i++) {
            pool.push(id);
        }
    }
    prng.shuffle(pool);

    const board = [];
    for (let i = 0; i < params.colorCount; i++) {
        const tube = [];
        for (let j = 0; j < params.capacity; j++) {
            tube.push(pool.pop());
        }
        board.push(tube);
    }

    // 加入緩衝空管
    for (let i = 0; i < params.emptyTubeCount; i++) {
        board.push([]);
    }

    return board;
}

/**
 * 生成通過三重門禁驗證之確定性關卡定義
 * @param {number} level - 關卡序號 L
 * @param {Partial<import('./constants.js').EXACT_SOLVER_POLICY>} [customPolicy] - 自訂求解政策
 * @returns {import('./types.js').LevelDefinition}
 */
export function generateLevel(level, customPolicy = {}) {
    const params = getLevelParams(level);
    const policy = { ...EXACT_SOLVER_POLICY, ...customPolicy };

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
        const derivedSeed = deriveLevelSeed(APP_CONFIG.rootSeedPrefix, level, attempt);
        const prng = createPRNG(derivedSeed);

        // 產生候選盤面
        const candidateBoard = generateCandidateBoard(params, prng);

        // Gate 1: 結構合法性校驗
        if (!validateBoardStructure(candidateBoard, params)) {
            continue;
        }

        // Gate 2: Exact Solver 最優性證明
        const solveRes = solveExact(candidateBoard, params.capacity, policy);

        if (solveRes.status !== 'solved' || !solveRes.optimalityProven) {
            continue;
        }

        // Gate 3: 目標解法步數區間檢驗
        if (solveRes.steps < params.minSteps || solveRes.steps > params.maxSteps) {
            continue;
        }

        // 三重門禁完全通過，產生管型並發布
        const tubeShapes = assignTubeShapes(level, params.tubeCount, prng);

        return {
            schemaVersion: APP_CONFIG.schemaVersion,
            generatorVersion: APP_CONFIG.generatorVersion,
            level,
            attempt,
            derivedSeed,
            capacity: params.capacity,
            colorCount: params.colorCount,
            tubeCount: params.tubeCount,
            initialBoard: candidateBoard,
            tubeShapes,
            knownOptimalSteps: solveRes.steps,
            solverProof: {
                algorithm: 'bfs',
                optimalityProven: true,
                exploredNodes: solveRes.exploredNodes,
                maxNodesPolicy: policy.maxNodesPerAttempt
            },
            optimalPath: solveRes.path
        };
    }

    // 超過最大嘗試次數時，回傳該關卡之無限派生備援盤面
    return deriveInfiniteFallbackLevel(level);
}
