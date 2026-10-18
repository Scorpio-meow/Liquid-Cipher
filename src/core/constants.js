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
export const TUBE_SHAPES = [
    'cylinder',
    'erlenmeyer',
    'bulb',
    'funnel',
    'hourglass'
];
export const EXACT_SOLVER_POLICY = {
    maxNodesPerAttempt: 2000000,
    maxDepth: 160,
    maxAttempts: 120
};
export const HINT_SOLVER_POLICY = {
    maxNodesPerAttempt: 250000,
    maxDepth: 160
};
export const WORKER_POLICY = {
    generateTimeoutMs: 20000,
    hintTimeoutMs: 8000
};
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
export const RANK_POLICY = {
    rankAMaxOver: 3
};
export const RENDER_CONFIG = {
    tubeAspect: 3.2,
    tubeMaxWidth: 80,
    tubeMinWidth: 30,
    cellFill: 0.58,
    maxRows: 3,
    liftRatio: 0.13,
    labelSpace: 22,
    pourDurationMs: 560,
    tiltAngleRad: Math.PI * 0.55,
    shakeDurationMs: 320,
    hintDurationMs: 5000,
    sealFlashMs: 700,
    confettiParticleCount: 90
};