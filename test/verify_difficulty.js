/**
 * 難度曲線非遞減特性與參數合法性驗證腳本
 */
import { getLevelParams } from '../src/core/difficulty.js';
function assert(condition, message) {
    if (!condition) {
        throw new Error(`[Assertion Failed] ${message}`);
    }
}
console.log('--- 正在執行難度曲線非遞減特性測試 (L = 1 ~ 100) ---');
let previous = null;
for (let L = 1; L <= 100; L++) {
    const current = getLevelParams(L);
    // 1. 結構基本合法性驗證
    assert(current.level === L, `關卡序號必須為 ${L}`);
    assert(current.colorCount >= 3 && current.colorCount <= 12, `關卡 ${L} 色數 ${current.colorCount} 超出 [3, 12] 範圍`);
    assert(current.emptyTubeCount === 2, `關卡 ${L} 空管數必須為 2`);
    assert(current.tubeCount === current.colorCount + 2, `關卡 ${L} 總管數必須為 色數 + 2`);
    assert([3, 4].includes(current.capacity), `關卡 ${L} 容量必須為 3 或 4`);
    assert(current.scrambleDepth >= 12 && current.scrambleDepth <= 160, `關卡 ${L} 置亂深度 ${current.scrambleDepth} 超出 [12, 160] 範圍`);
    assert(current.minSteps <= current.maxSteps, `關卡 ${L} minSteps (${current.minSteps}) 必須小於等於 maxSteps (${current.maxSteps})`);
    assert(current.availableShapes.length >= 1, `關卡 ${L} 必須至少有一種可用造型`);
    // 2. 非遞減特性檢驗
    if (previous !== null) {
        assert(current.colorCount >= previous.colorCount, `關卡 ${L} 色數 (${current.colorCount}) 發生遞減 (前一關: ${previous.colorCount})`);
        assert(current.capacity >= previous.capacity, `關卡 ${L} 容量 (${current.capacity}) 發生遞減 (前一關: ${previous.capacity})`);
        assert(current.tubeCount >= previous.tubeCount, `關卡 ${L} 總管數 (${current.tubeCount}) 發生遞減 (前一關: ${previous.tubeCount})`);
        assert(current.scrambleDepth >= previous.scrambleDepth, `關卡 ${L} 置亂深度 (${current.scrambleDepth}) 發生遞減 (前一關: ${previous.scrambleDepth})`);
        assert(current.minSteps >= previous.minSteps, `關卡 ${L} minSteps (${current.minSteps}) 發生遞減 (前一關: ${previous.minSteps})`);
        assert(current.maxSteps >= previous.maxSteps, `關卡 ${L} maxSteps (${current.maxSteps}) 發生遞減 (前一關: ${previous.maxSteps})`);
    }
    previous = current;
}
console.log('✓ 關卡 1 ~ 100 之色彩、管數、容量、置亂深度與步數區間非遞減特性驗證全部通過！');