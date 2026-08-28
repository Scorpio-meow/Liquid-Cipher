/**
 * 液體解鎖 (Liquid Cipher) 難度曲線計算模組
 * 依據關卡序號 L 計算純數學難度參數與目標步數區間。
 */
import { TUBE_SHAPES, REAGENTS } from './constants.js';
/**
 * 依據關卡序號 L 計算完整難度參數
 * @param {number} level - 關卡序號 (L >= 1)
 * @returns {import('./types.js').LevelParams}
 */
export function getLevelParams(level) {
    const L = Math.max(1, Math.floor(level));
    // 色彩數量 C(L): 初始 3 色，對數漸進，上限 12 色 (非遞減)
    const colorCount = Math.min(REAGENTS.length, Math.floor(3 + 1.8 * Math.log(L)));
    // 試管容量 V(L): L <= 2 時為 3，L >= 3 時為標準 4 (非遞減)
    const capacity = L <= 2 ? 3 : 4;
    // 緩衝空管數 E(L): 固定為 2
    const emptyTubeCount = 2;
    // 總管數 T(L) = C(L) + E(L) (非遞減)
    const tubeCount = colorCount + emptyTubeCount;
    // 逆向置亂深度 S(L): 非遞減，上限 160
    const scrambleDepth = Math.min(160, Math.floor(12 + 18 * Math.log(L + 1) + colorCount * 4));
    // 目標最少解法步數下限 MinSteps(L): 非遞減
    const minSteps = Math.max(3, Math.floor(1.8 * colorCount + 1.5 * Math.log(L)));
    // 目標最少解法步數上限 MaxSteps(L): 非遞減
    const maxSteps = Math.floor(6.0 * colorCount + 12 * Math.log(L + 1) + 8);
    // 依關卡序號解鎖幾何試管造型
    let availableShapes = ['cylinder'];
    if (L >= 4) availableShapes.push('erlenmeyer');
    if (L >= 8) availableShapes.push('bulb');
    if (L >= 14) availableShapes.push('funnel');
    if (L >= 22) availableShapes.push('hourglass');
    return {
        level: L,
        colorCount,
        capacity,
        emptyTubeCount,
        tubeCount,
        scrambleDepth,
        minSteps,
        maxSteps,
        availableShapes
    };
}
/**
 * 依據關卡序號與總管數，為每個試管分配對應的造型清單
 * @param {number} level - 關卡序號
 * @param {number} totalTubes - 總試管數
 * @param {import('./prng.js').createPRNG} prng - 隨機生成器
 * @returns {string[]}
 */
export function assignTubeShapes(level, totalTubes, prng) {
    const params = getLevelParams(level);
    const shapes = [];
    for (let i = 0; i < totalTubes; i++) {
        shapes.push(prng.choice(params.availableShapes));
    }
    return shapes;
}