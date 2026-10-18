import { APP_CONFIG, EXACT_SOLVER_POLICY, REAGENTS } from './constants.js';
import { getLevelParams, assignTubeShapes } from './difficulty.js';
import { deriveLevelSeed } from './hash.js';
import { createPRNG } from './prng.js';
import { solveExact } from './solver.js';
import { isBoardSolved } from './board.js';
import { deriveInfiniteFallbackLevel } from './fallbackLevels.js';
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
    if (isBoardSolved(board, params.capacity)) return false;
    return true;
}
export function generateCandidateBoard(params, prng) {
    const selectedColorIds = REAGENTS.slice(0, params.colorCount).map(r => r.id);
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
    for (let i = 0; i < params.emptyTubeCount; i++) {
        board.push([]);
    }
    return board;
}
export function generateLevel(level, customPolicy = {}) {
    const params = getLevelParams(level);
    const policy = { ...EXACT_SOLVER_POLICY, ...customPolicy };
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
        const derivedSeed = deriveLevelSeed(APP_CONFIG.rootSeedPrefix, level, attempt);
        const prng = createPRNG(derivedSeed);
        const candidateBoard = generateCandidateBoard(params, prng);
        if (!validateBoardStructure(candidateBoard, params)) {
            continue;
        }
        const solveRes = solveExact(candidateBoard, params.capacity, policy);
        if (solveRes.status !== 'solved' || !solveRes.optimalityProven) {
            continue;
        }
        if (solveRes.steps < params.minSteps || solveRes.steps > params.maxSteps) {
            continue;
        }
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
    return deriveInfiniteFallbackLevel(level);
}