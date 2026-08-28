/**
 * 液體解鎖 (Liquid Cipher) JSDoc 資料型別定義
 */
/**
 * @typedef {Object} Reagent
 * @property {string} id - 試劑識別代碼 (e.g. 'crimson')
 * @property {string} name - 試劑中文名稱 (e.g. '赤紅試劑')
 * @property {string} hex - 十六進位色碼 (e.g. '#EF4444')
 * @property {number[]} rgb - [R, G, B] 數值 (0~255)
 * @property {string} symbol - 色盲輔助符號代碼 (e.g. 'R1')
 * @property {string} description - 試劑描述
 */
/**
 * @typedef {Object} LevelParams
 * @property {number} level - 關卡序號 L (L >= 1)
 * @property {number} colorCount - 色彩數量 C(L)
 * @property {number} capacity - 試管容量 V(L)
 * @property {number} emptyTubeCount - 空管數量 E(L) (固定為 2)
 * @property {number} tubeCount - 總管數 T(L) = C(L) + E(L)
 * @property {number} scrambleDepth - 逆向置亂深度 S(L)
 * @property {number} minSteps - 預期最少解法步數下限 MinSteps(L)
 * @property {number} maxSteps - 預期最少解法步數上限 MaxSteps(L)
 * @property {string[]} availableShapes - 該關卡可解鎖之試管造型清單
 */
/**
 * @typedef {Object} SolverProof
 * @property {string} algorithm - 搜尋演算法名稱 (e.g. 'bfs', 'bidirectional-bfs')
 * @property {boolean} optimalityProven - 是否已證明最優解
 * @property {number} exploredNodes - 已探索節點數
 * @property {number} maxNodesPolicy - 節點上限常數
 * @property {number} [elapsedMs] - 搜尋耗時 (毫秒)
 */
/**
 * @typedef {Object} MoveAction
 * @property {number} from - 來源試管索引
 * @property {number} to - 目標試管索引
 * @property {number} amount - 傾倒容量單位 (整數)
 * @property {string} colorId - 傾倒試劑 ID
 */
/**
 * @typedef {Object} LevelDefinition
 * @property {number} schemaVersion - 資料架構版本
 * @property {number} generatorVersion - 生成器演算法版本
 * @property {number} level - 關卡序號
 * @property {number} attempt - 生成嘗試次數
 * @property {number} derivedSeed - 32-bit 派生種子數值
 * @property {number} capacity - 單管容量上限
 * @property {number} [colorCount] - 色彩數量
 * @property {number} [tubeCount] - 總試管數量
 * @property {string[][]} initialBoard - 初始盤面 (每個試管包含由底至頂的試劑 ID 陣列)
 * @property {string[]} tubeShapes - 每個試管對應的幾何外型
 * @property {number} knownOptimalSteps - 已證明之最短解法步數
 * @property {SolverProof} solverProof - 求解器證明中繼資料
 * @property {MoveAction[]} [optimalPath] - 最優解路徑 (可選)
 */
/**
 * @typedef {Object} SolverResult
 * @property {'solved'|'node_limit_exceeded'|'depth_exceeded'|'unsolvable'} status - 求解狀態
 * @property {boolean} optimalityProven - 是否證明最優性
 * @property {number} steps - 最少步數 (若無解為 -1)
 * @property {MoveAction[]} path - 解法路徑
 * @property {number} exploredNodes - 探索節點數
 * @property {number} elapsedMs - 耗時毫秒
 */
/**
 * @typedef {Object} SaveData
 * @property {number} schemaVersion - 存檔結構版本
 * @property {number} generatorVersion - 生成器版本
 * @property {number} activeLevel - 玩家目前正在進行的關卡
 * @property {number} highestUnlockedLevel - 玩家已解鎖的最高關卡
 * @property {number} levelSeed - 當前關卡派生種子
 * @property {number} generationAttempt - 當前關卡生成次數
 * @property {string[][]} initialBoard - 本關初始盤面
 * @property {string[][]} currentBoard - 本關當前進度盤面
 * @property {string[][][]} moveHistory - 撤銷歷史狀態堆疊
 * @property {string[][][]} redoHistory - 重做歷史狀態堆疊
 * @property {number} knownOptimalSteps - 本關已知最短步數
 * @property {number} elapsedMs - 當前關卡遊玩累計時間
 * @property {boolean} colorBlindMode - 色盲模式開關狀態
 * @property {boolean} soundEnabled - 音效開關狀態
 */
export const TYPE_GUARD = true;