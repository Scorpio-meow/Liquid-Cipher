/**
 * 液體解鎖 (Liquid Cipher) 雙層無限 Fallback 備援資料庫與派生配方
 * 生成重試耗盡時提供可解盤面；最少步數僅在 Exact Solver 證明成功時填入，否則為 null。
 */
import { APP_CONFIG, EXACT_SOLVER_POLICY, REAGENTS } from './constants.js';
import { getLevelParams, assignTubeShapes } from './difficulty.js';
import { createPRNG } from './prng.js';
import { deriveLevelSeed } from './hash.js';
import { solveExact } from './solver.js';
/**
 * 第一層：固定里程碑預驗證關卡清單
 * 每個關卡均包含完整盤面定義與已知最短步數證明
 * @type {Record<number, import('./types.js').LevelDefinition>}
 */
export const MILESTONE_FALLBACK_LEVELS = {
    1: {
        schemaVersion: APP_CONFIG.schemaVersion,
        generatorVersion: 1,
        level: 1,
        attempt: 1,
        derivedSeed: 100000001,
        capacity: 3,
        colorCount: 3,
        tubeCount: 5,
        initialBoard: [
            ['cobalt', 'crimson', 'crimson'],
            ['solar', 'cobalt', 'solar'],
            ['crimson', 'solar', 'cobalt'],
            [],
            []
        ],
        tubeShapes: ['cylinder', 'cylinder', 'cylinder', 'cylinder', 'cylinder'],
        knownOptimalSteps: 6,
        solverProof: {
            algorithm: 'bfs',
            optimalityProven: true,
            exploredNodes: 50,
            maxNodesPolicy: 2000000
        }
    },
    2: {
        schemaVersion: APP_CONFIG.schemaVersion,
        generatorVersion: 1,
        level: 2,
        attempt: 1,
        derivedSeed: 100000002,
        capacity: 3,
        colorCount: 4,
        tubeCount: 6,
        initialBoard: [
            ['solar', 'crimson', 'cobalt'],
            ['crimson', 'emerald', 'crimson'],
            ['cobalt', 'cobalt', 'solar'],
            ['emerald', 'emerald', 'solar'],
            [],
            []
        ],
        tubeShapes: ['cylinder', 'cylinder', 'cylinder', 'cylinder', 'cylinder', 'cylinder'],
        knownOptimalSteps: 7,
        solverProof: {
            algorithm: 'bfs',
            optimalityProven: true,
            exploredNodes: 94,
            maxNodesPolicy: 2000000
        }
    },
    5: {
        schemaVersion: APP_CONFIG.schemaVersion,
        generatorVersion: 1,
        level: 5,
        attempt: 1,
        derivedSeed: 100000005,
        capacity: 4,
        colorCount: 5,
        tubeCount: 7,
        initialBoard: [
            ['crimson', 'cobalt', 'solar', 'emerald'],
            ['amethyst', 'crimson', 'cobalt', 'solar'],
            ['emerald', 'amethyst', 'crimson', 'cobalt'],
            ['solar', 'emerald', 'amethyst', 'crimson'],
            ['cobalt', 'solar', 'emerald', 'amethyst'],
            [],
            []
        ],
        tubeShapes: ['cylinder', 'erlenmeyer', 'cylinder', 'erlenmeyer', 'cylinder', 'cylinder', 'cylinder'],
        knownOptimalSteps: 16,
        solverProof: {
            algorithm: 'bfs',
            optimalityProven: true,
            exploredNodes: 2443,
            maxNodesPolicy: 2000000
        }
    },
    10: {
        schemaVersion: APP_CONFIG.schemaVersion,
        generatorVersion: 1,
        level: 10,
        attempt: 1,
        derivedSeed: 100000010,
        capacity: 4,
        colorCount: 7,
        tubeCount: 9,
        initialBoard: [
            ['crimson', 'cobalt', 'solar', 'emerald'],
            ['amethyst', 'amber', 'cyan', 'crimson'],
            ['cobalt', 'solar', 'emerald', 'amethyst'],
            ['amber', 'cyan', 'crimson', 'cobalt'],
            ['solar', 'emerald', 'amethyst', 'amber'],
            ['cyan', 'crimson', 'cobalt', 'solar'],
            ['emerald', 'amethyst', 'amber', 'cyan'],
            [],
            []
        ],
        tubeShapes: ['bulb', 'erlenmeyer', 'cylinder', 'bulb', 'erlenmeyer', 'cylinder', 'bulb', 'cylinder', 'cylinder'],
        knownOptimalSteps: 22,
        solverProof: {
            algorithm: 'bfs',
            optimalityProven: true,
            exploredNodes: 10563,
            maxNodesPolicy: 2000000
        }
    }
};
/**
 * 依可解盤面建立關卡定義
 * @param {number} level
 * @param {import('./types.js').LevelParams} params
 * @param {number} seed
 * @param {string[][]} board
 * @param {string[]} tubeShapes
 * @param {import('./types.js').SolverResult} solveRes
 * @returns {import('./types.js').LevelDefinition}
 */
function buildFallbackDefinition(level, params, seed, board, tubeShapes, solveRes) {
    const proven = solveRes.status === 'solved';
    return {
        schemaVersion: APP_CONFIG.schemaVersion,
        generatorVersion: APP_CONFIG.generatorVersion,
        level,
        attempt: 0,
        derivedSeed: seed,
        capacity: params.capacity,
        colorCount: params.colorCount,
        tubeCount: params.tubeCount,
        initialBoard: board,
        tubeShapes,
        knownOptimalSteps: proven ? solveRes.steps : null,
        solverProof: {
            algorithm: 'bfs',
            optimalityProven: proven,
            exploredNodes: solveRes.exploredNodes,
            maxNodesPolicy: EXACT_SOLVER_POLICY.maxNodesPerAttempt
        }
    };
}
/**
 * 第二層：無限派生備援配方
 * 先嘗試確定性洗牌盤面；若無法在政策內證明可解，改用輪替排列盤面（構造上必定可解）。
 * @param {number} level
 * @returns {import('./types.js').LevelDefinition}
 */
export function deriveInfiniteFallbackLevel(level) {
    if (MILESTONE_FALLBACK_LEVELS[level]) {
        return structuredClone(MILESTONE_FALLBACK_LEVELS[level]);
    }
    const params = getLevelParams(level);
    const seed = deriveLevelSeed(APP_CONFIG.fallbackSeedPrefix, level, 1);
    const prng = createPRNG(seed);
    const colorIds = REAGENTS.slice(0, params.colorCount).map(r => r.id);
    const emptyTubes = Array.from({ length: params.emptyTubeCount }, () => []);
    const segments = colorIds.flatMap(id => new Array(params.capacity).fill(id));
    prng.shuffle(segments);
    const shuffledBoard = colorIds.map((_, i) => segments.slice(i * params.capacity, (i + 1) * params.capacity));
    shuffledBoard.push(...emptyTubes.map(t => [...t]));
    const tubeShapes = assignTubeShapes(level, params.tubeCount, prng);
    const shuffledRes = solveExact(shuffledBoard, params.capacity, EXACT_SOLVER_POLICY);
    if (shuffledRes.status === 'solved') {
        return buildFallbackDefinition(level, params, seed, shuffledBoard, tubeShapes, shuffledRes);
    }
    const rotatedBoard = colorIds.map((_, i) =>
        Array.from({ length: params.capacity }, (_, j) => colorIds[(i + j) % params.colorCount])
    );
    rotatedBoard.push(...emptyTubes.map(t => [...t]));
    const rotatedRes = solveExact(rotatedBoard, params.capacity, EXACT_SOLVER_POLICY);
    return buildFallbackDefinition(level, params, seed, rotatedBoard, tubeShapes, rotatedRes);
}
