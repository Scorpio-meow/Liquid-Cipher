import { APP_CONFIG, EXACT_SOLVER_POLICY, REAGENTS } from './constants.js';
import { getLevelParams, assignTubeShapes } from './difficulty.js';
import { createPRNG } from './prng.js';
import { deriveLevelSeed } from './hash.js';
import { solveExact } from './solver.js';
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