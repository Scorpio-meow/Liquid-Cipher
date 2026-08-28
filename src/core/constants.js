/**
 * 液體解鎖 (Liquid Cipher) 全域常數與設定檔
 */
// 12 種標準化實驗室化學試劑色譜定義
export const REAGENTS = [
    {
        id: 'crimson',
        name: '赤紅試劑',
        hex: '#EF4444',
        rgb: [239, 68, 68],
        symbol: 'R1',
        description: '高能活性紅色溶液'
    },
    {
        id: 'cobalt',
        name: '鈷藍試劑',
        hex: '#3B82F6',
        rgb: [59, 130, 246],
        symbol: 'B2',
        description: '深海鈷金屬穩定劑'
    },
    {
        id: 'solar',
        name: '日耀試劑',
        hex: '#EAB308',
        rgb: [234, 179, 8],
        symbol: 'Y3',
        description: '光合光譜激發黃液'
    },
    {
        id: 'emerald',
        name: '翡翠試劑',
        hex: '#10B981',
        rgb: [16, 185, 129],
        symbol: 'G4',
        description: '高純度翠綠催化液'
    },
    {
        id: 'amethyst',
        name: '紫晶試劑',
        hex: '#A855F7',
        rgb: [168, 85, 247],
        symbol: 'P5',
        description: '稀有紫晶共振液'
    },
    {
        id: 'amber',
        name: '琥珀試劑',
        hex: '#F97316',
        rgb: [249, 115, 22],
        symbol: 'O6',
        description: '高粘度琥珀凝膠'
    },
    {
        id: 'cyan',
        name: '電青試劑',
        hex: '#06B6D4',
        rgb: [6, 182, 212],
        symbol: 'C7',
        description: '超導電青離子水'
    },
    {
        id: 'rose',
        name: '薔薇試劑',
        hex: '#F43F5E',
        rgb: [244, 63, 94],
        symbol: 'M8',
        description: '低溫合成薔薇粉劑'
    },
    {
        id: 'lime',
        name: '熒綠試劑',
        hex: '#84CC16',
        rgb: [132, 204, 22],
        symbol: 'L9',
        description: '熒光生物標記液'
    },
    {
        id: 'indigo',
        name: '靛藍試劑',
        hex: '#6366F1',
        rgb: [99, 102, 241],
        symbol: 'I10',
        description: '深層靛藍合成基質'
    },
    {
        id: 'teal',
        name: '水鴨試劑',
        hex: '#14B8A6',
        rgb: [20, 184, 166],
        symbol: 'T11',
        description: '水合矽酸鹽緩衝液'
    },
    {
        id: 'coral',
        name: '珊瑚試劑',
        hex: '#FB7185',
        rgb: [251, 113, 133],
        symbol: 'K12',
        description: '微熱珊瑚有機試劑'
    }
];
// 5 種實驗室幾何試管造型
export const TUBE_SHAPES = [
    'cylinder',    // 經典圓柱試管
    'erlenmeyer',  // 錐形瓶
    'bulb',        // 圓底燒瓶
    'funnel',      // 漏斗型試管
    'hourglass'    // 沙漏型試管
];
// Exact Solver 跨裝置確定性運算門禁政策
export const EXACT_SOLVER_POLICY = {
    maxNodesPerAttempt: 2000000,
    maxDepth: 160,
    maxAttempts: 120,
    uiWatchdogMs: 8000
};
// 儲存與產生器版本常數
export const APP_CONFIG = {
    schemaVersion: 1,
    generatorVersion: 1,
    rootSeedPrefix: 'liquid-cipher:v1',
    storageKey: 'liquid_cipher_save_v1',
    cachePrefix: 'liquid_cipher_level_cache_v1_'
};
// 幾何尺寸與物理參數常數
export const RENDER_CONFIG = {
    tubeWidth: 64,
    tubeHeight: 200,
    tubeSpacingMax: 110,
    tubeSpacingMin: 70,
    pourDurationMs: 480,
    tiltAngleRad: Math.PI / 2.6,
    liftOffsetPx: 28,
    meniscusCurveDepth: 5,
    bubbleCountPerPour: 8,
    confettiParticleCount: 100
};