/**
 * 求解器與關卡生成管線三重門禁驗證腳本
 */
import { solveExact, isBoardSolved } from '../src/core/solver.js';
import { generateLevel, validateBoardStructure } from '../src/core/generator.js';
import { getLevelParams } from '../src/core/difficulty.js';
import { deriveInfiniteFallbackLevel } from '../src/core/fallbackLevels.js';
import { EXACT_SOLVER_POLICY } from '../src/core/constants.js';
function assert(condition, message) {
    if (!condition) {
        throw new Error(`[Assertion Failed] ${message}`);
    }
}
console.log('--- 正在執行 Solver 與生成管線門禁測試 ---');
// 1. 測試已通關狀態判定
const solvedSample = [
    ['crimson', 'crimson', 'crimson'],
    ['cobalt', 'cobalt', 'cobalt'],
    ['solar', 'solar', 'solar'],
    [],
    []
];
assert(isBoardSolved(solvedSample, 3) === true, '全純色滿管 + 空管必須判定為通關');
const unsolvedSample = [
    ['crimson', 'cobalt', 'crimson'],
    ['cobalt', 'crimson', 'solar'],
    ['solar', 'solar', 'cobalt'],
    [],
    []
];
assert(isBoardSolved(unsolvedSample, 3) === false, '雜色盤面不可判定為通關');
console.log('✓ 盤面通關狀態邏輯驗證通過');
// 2. 測試 Exact Solver 最優性證明
const solveResult = solveExact(unsolvedSample, 3, EXACT_SOLVER_POLICY);
assert(solveResult.status === 'solved', '求解器必須能解出簡易可解盤面');
assert(solveResult.optimalityProven === true, 'BFS 解法必須標記最優性已證明');
assert(solveResult.steps > 0, '解法步數必須大於 0');
assert(solveResult.path.length === solveResult.steps, '解法路徑長度必須與步數一致');
console.log(`✓ Exact Solver 成功求解 (步數: ${solveResult.steps}, 探索節點: ${solveResult.exploredNodes})`);
// 3. 測試關卡生成器生成前 5 個關卡
for (let L = 1; L <= 5; L++) {
    const params = getLevelParams(L);
    const levelDef = generateLevel(L);
    assert(levelDef.level === L, `關卡序號必須為 ${L}`);
    assert(levelDef.capacity === params.capacity, `關卡容量必須為 ${params.capacity}`);
    assert(levelDef.initialBoard.length === params.tubeCount, `試管數量必須為 ${params.tubeCount}`);
    assert(levelDef.knownOptimalSteps >= params.minSteps, `關卡 ${L} 最優步數 (${levelDef.knownOptimalSteps}) 必須 >= minSteps (${params.minSteps})`);
    assert(levelDef.knownOptimalSteps <= params.maxSteps, `關卡 ${L} 最優步數 (${levelDef.knownOptimalSteps}) 必須 <= maxSteps (${params.maxSteps})`);
    assert(levelDef.solverProof.optimalityProven === true, `關卡 ${L} 必須具備最優性證明`);
    assert(validateBoardStructure(levelDef.initialBoard, params) === true, `關卡 ${L} 盤面結構必須合法`);
    console.log(`✓ 關卡 ${L} 成功生成並通過三重門禁 (種子: ${levelDef.derivedSeed}, 最少步數: ${levelDef.knownOptimalSteps})`);
}
// 4. 測試 Fallback 備援機制
const fallback1 = deriveInfiniteFallbackLevel(1);
const fallback50 = deriveInfiniteFallbackLevel(50);
assert(fallback1.level === 1, 'Fallback Level 1 正確');
assert(fallback50.level === 50, 'Fallback Level 50 正確');
assert(fallback50.knownOptimalSteps > 0, 'Fallback 必須提供有效步數');
console.log('✓ 雙層 Fallback 備援配方驗證通過');
console.log('所有求解器與生成管線測試全部成功！');