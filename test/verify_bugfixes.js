import { GameSession } from '../src/core/session.js';
import { generateLevel } from '../src/core/generator.js';
import { deriveInfiniteFallbackLevel, MILESTONE_FALLBACK_LEVELS } from '../src/core/fallbackLevels.js';
import { getValidMoves, solveExact } from '../src/core/solver.js';
import { EXACT_SOLVER_POLICY } from '../src/core/constants.js';
console.log('--- 正在執行 Bug 修復回歸驗證測試 ---');
{
    const session = new GameSession(() => 0);
    const levelDef = generateLevel(1);
    session.load(levelDef, null);
    const moves = getValidMoves(session.board, levelDef.capacity);
    session.pour(moves[0].from, moves[0].to);
    if (session.history.length !== 1) {
        throw new Error('執行倒水後 history 長度應為 1');
    }
    session.restart();
    if (session.history.length !== 0 || session.redoStack.length !== 0) {
        throw new Error('重置關卡後 history 與 redoStack 必須為空陣列！');
    }
    console.log('✓ Bug 1 (restart 清空歷史記錄) 驗證通過');
}
{
    const levelDef = generateLevel(1);
    if (typeof levelDef.colorCount !== 'number' || typeof levelDef.tubeCount !== 'number') {
        throw new Error('generateLevel 回傳之 LevelDefinition 必須包含 colorCount 與 tubeCount！');
    }
    const fallbackDef = deriveInfiniteFallbackLevel(3);
    if (typeof fallbackDef.colorCount !== 'number' || typeof fallbackDef.tubeCount !== 'number') {
        throw new Error('deriveInfiniteFallbackLevel 回傳之 LevelDefinition 必須包含 colorCount 與 tubeCount！');
    }
    for (const lvl of [1, 2, 5, 10]) {
        const ms = MILESTONE_FALLBACK_LEVELS[lvl];
        if (typeof ms.colorCount !== 'number' || typeof ms.tubeCount !== 'number') {
            throw new Error(`MILESTONE_FALLBACK_LEVELS[${lvl}] 缺少 colorCount 或 tubeCount！`);
        }
    }
    console.log('✓ Bug 2 (colorCount 與 tubeCount 欄位存在性) 驗證通過');
}
{
    const testBoard = [
        ['cobalt', 'crimson'],
        ['solar', 'emerald'],
        [],
        []
    ];
    const moves = getValidMoves(testBoard, 4);
    const from0ToEmpty = moves.filter(m => m.from === 0 && (m.to === 2 || m.to === 3));
    const from1ToEmpty = moves.filter(m => m.from === 1 && (m.to === 2 || m.to === 3));
    if (from0ToEmpty.length !== 1 || from1ToEmpty.length !== 1) {
        throw new Error('每個來源管都應能各自探索一次倒入空管的對稱動作！');
    }
    console.log('✓ Bug 3 (seenEmptyTarget 作用域與空管探索) 驗證通過');
}
{
    const levelDef = generateLevel(2);
    const res = solveExact(levelDef.initialBoard, levelDef.capacity, EXACT_SOLVER_POLICY);
    if (res.status !== 'solved') {
        throw new Error('solveExact 求解失敗');
    }
    console.log('✓ Bug 4 (BFS queue 記憶體管理與求解有效性) 驗證通過');
}
{
    for (const [lvl, def] of Object.entries(MILESTONE_FALLBACK_LEVELS)) {
        const res = solveExact(def.initialBoard, def.capacity, EXACT_SOLVER_POLICY);
        if (res.steps !== def.knownOptimalSteps) {
            throw new Error(`里程碑第 ${lvl} 關宣稱 ${def.knownOptimalSteps} 步，實際最少 ${res.steps} 步！`);
        }
    }
    console.log('✓ Bug 5 (里程碑備援關卡最少步數正確) 驗證通過');
}
console.log('所有 Bug 修復回歸驗證測試全部通過！');