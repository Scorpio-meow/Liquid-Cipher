/**
 * 液體解鎖 (Liquid Cipher) 全域常數與設定檔
 */
// 12 種試劑色譜：色相與明度刻意拉開，確保同盤 12 色仍可辨識；glyph 為色盲模式的形狀符號
export const REAGENTS = [
    { id: 'crimson', name: '赤紅', hex: '#E5484D', rgb: [229, 72, 77], glyph: 'circle' },
    { id: 'cobalt', name: '鈷藍', hex: '#3E63DD', rgb: [62, 99, 221], glyph: 'triangle' },
    { id: 'solar', name: '日耀黃', hex: '#F5C542', rgb: [245, 197, 66], glyph: 'square' },
    { id: 'emerald', name: '翡翠綠', hex: '#2FA36B', rgb: [47, 163, 107], glyph: 'diamond' },
    { id: 'amethyst', name: '紫晶', hex: '#8E4EC6', rgb: [142, 78, 198], glyph: 'star' },
    { id: 'amber', name: '琥珀橙', hex: '#F2711C', rgb: [242, 113, 28], glyph: 'plus' },
    { id: 'cyan', name: '電青', hex: '#3CC6DD', rgb: [60, 198, 221], glyph: 'hexagon' },
    { id: 'rose', name: '薔薇粉', hex: '#EE6FB0', rgb: [238, 111, 176], glyph: 'ring' },
    { id: 'lime', name: '熒綠', hex: '#A8D13A', rgb: [168, 209, 58], glyph: 'cross' },
    { id: 'umber', name: '赭棕', hex: '#A0703F', rgb: [160, 112, 63], glyph: 'bar' },
    { id: 'pearl', name: '珍珠白', hex: '#E6E9EC', rgb: [230, 233, 236], glyph: 'chevron' },
    { id: 'slate', name: '石板灰', hex: '#6F7C8C', rgb: [111, 124, 140], glyph: 'moon' }
];
// 5 種實驗室幾何試管造型
export const TUBE_SHAPES = [
    'cylinder',    // 經典圓柱試管
    'erlenmeyer',  // 錐形瓶
    'bulb',        // 圓底燒瓶
    'funnel',      // 漏斗型試管
    'hourglass'    // 沙漏型試管
];
// 關卡發布前 Exact Solver 門禁政策
export const EXACT_SOLVER_POLICY = {
    maxNodesPerAttempt: 2000000,
    maxDepth: 160,
    maxAttempts: 120
};
// 遊戲中提示求解政策（盤面已部分進行，節點預算較發布門禁小）
export const HINT_SOLVER_POLICY = {
    maxNodesPerAttempt: 250000,
    maxDepth: 160
};
// 背景 Worker 任務逾時（逾時即終止並重建 Worker）
export const WORKER_POLICY = {
    generateTimeoutMs: 20000,
    hintTimeoutMs: 8000
};
// 儲存與產生器版本常數
export const APP_CONFIG = {
    schemaVersion: 2,
    generatorVersion: 1,
    rootSeedPrefix: 'liquid-cipher:v1',
    fallbackSeedPrefix: 'liquid-cipher:fallback:v1',
    storageKey: 'liquid_cipher_save_v2',
    cachePrefix: 'liquid_cipher_level_v2_',
    legacyStorageKey: 'liquid_cipher_save_v1',
    legacyCachePrefix: 'liquid_cipher_level_cache_v1_'
};
// 評級門檻：步數 ≤ 最少步數為 S，超出不多於 rankAMaxOver 為 A，其餘 B
export const RANK_POLICY = {
    rankAMaxOver: 3
};
// 渲染與動畫參數
export const RENDER_CONFIG = {
    tubeAspect: 3.2,          // 試管高 / 寬
    tubeMaxWidth: 80,
    tubeMinWidth: 30,
    cellFill: 0.58,           // 試管寬佔格寬比例
    maxRows: 3,
    liftRatio: 0.13,          // 選取時升起距離（相對管高）
    labelSpace: 22,           // 管底編號區高度
    pourDurationMs: 560,
    tiltAngleRad: Math.PI * 0.55,  // 超過水平，瓶口低於瓶底才倒得出來
    shakeDurationMs: 320,
    hintDurationMs: 5000,
    sealFlashMs: 700,
    confettiParticleCount: 90
};
