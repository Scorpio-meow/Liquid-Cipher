/**
 * 液體解鎖 (Liquid Cipher) 存檔層
 * 封裝 localStorage：玩家設定檔讀寫、關卡定義快取（只保留目前與下一關）與 v1 存檔遷移。
 * 儲存後端可注入；環境沒有 localStorage 時退化為僅存在記憶體。
 */
import { APP_CONFIG } from './constants.js';
import { isWellFormedBoard } from './board.js';
/**
 * @returns {import('./types.js').SaveProfile}
 */
export function createDefaultProfile() {
    return {
        schemaVersion: APP_CONFIG.schemaVersion,
        activeLevel: 1,
        highestLevel: 1,
        settings: { colorBlind: false, sound: true },
        records: {},
        seenHelp: false,
        session: null
    };
}
/**
 * @param {unknown} n
 * @returns {boolean}
 */
function isPositiveInt(n) {
    return Number.isInteger(n) && n >= 1;
}
/**
 * @param {unknown} n
 * @returns {boolean}
 */
function isNonNegativeInt(n) {
    return Number.isInteger(n) && n >= 0;
}
/**
 * 記憶體版 Storage（無 localStorage 時使用）
 */
class MemoryStorage {
    constructor() {
        /** @type {Map<string, string>} */
        this.map = new Map();
    }
    get length() {
        return this.map.size;
    }
    key(i) {
        return [...this.map.keys()][i] ?? null;
    }
    getItem(k) {
        return this.map.has(k) ? this.map.get(k) : null;
    }
    setItem(k, v) {
        this.map.set(k, String(v));
    }
    removeItem(k) {
        this.map.delete(k);
    }
}
export class SaveStore {
    /**
     * @param {Storage|null} backend
     */
    constructor(backend) {
        this.backend = backend || new MemoryStorage();
    }
    /**
     * @param {string} key
     * @returns {any}
     */
    readJson(key) {
        try {
            const raw = this.backend.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn(`讀取存檔 ${key} 失敗:`, e);
            return null;
        }
    }
    /**
     * @param {string} key
     * @param {any} value
     */
    writeJson(key, value) {
        try {
            this.backend.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`寫入存檔 ${key} 失敗:`, e);
        }
    }
    /**
     * @param {string} prefix
     * @returns {string[]}
     */
    keysWithPrefix(prefix) {
        const keys = [];
        for (let i = 0; i < this.backend.length; i++) {
            const k = this.backend.key(i);
            if (k && k.startsWith(prefix)) keys.push(k);
        }
        return keys;
    }
    /**
     * 讀取玩家設定檔；欄位逐一驗證，壞掉的欄位以預設值取代
     * @returns {import('./types.js').SaveProfile}
     */
    loadProfile() {
        const profile = createDefaultProfile();
        const data = this.readJson(APP_CONFIG.storageKey) ?? this.migrateLegacy();
        if (!data || data.schemaVersion !== APP_CONFIG.schemaVersion) return profile;
        if (isPositiveInt(data.activeLevel)) profile.activeLevel = data.activeLevel;
        profile.highestLevel = Math.max(profile.activeLevel, isPositiveInt(data.highestLevel) ? data.highestLevel : 1);
        if (data.settings) {
            if (typeof data.settings.colorBlind === 'boolean') profile.settings.colorBlind = data.settings.colorBlind;
            if (typeof data.settings.sound === 'boolean') profile.settings.sound = data.settings.sound;
        }
        if (data.records && typeof data.records === 'object') {
            for (const [level, rec] of Object.entries(data.records)) {
                if (isPositiveInt(Number(level)) && rec && isPositiveInt(rec.moves) && isNonNegativeInt(rec.timeMs)) {
                    profile.records[level] = { moves: rec.moves, timeMs: rec.timeMs };
                }
            }
        }
        if (typeof data.seenHelp === 'boolean') profile.seenHelp = data.seenHelp;
        if (data.session && data.session.level === profile.activeLevel) {
            profile.session = data.session;
        }
        return profile;
    }
    /**
     * @param {import('./types.js').SaveProfile} profile
     */
    saveProfile(profile) {
        this.writeJson(APP_CONFIG.storageKey, profile);
    }
    /**
     * 讀取已驗證關卡快取
     * @param {number} level
     * @returns {import('./types.js').LevelDefinition|null}
     */
    getLevel(level) {
        const def = this.readJson(`${APP_CONFIG.cachePrefix}${level}`);
        if (!def || def.schemaVersion !== APP_CONFIG.schemaVersion || def.level !== level) return null;
        if (!Number.isInteger(def.capacity) || !isWellFormedBoard(def.initialBoard, def.capacity)) return null;
        if (!Array.isArray(def.tubeShapes) || def.tubeShapes.length !== def.initialBoard.length) return null;
        return def;
    }
    /**
     * 寫入關卡快取，並清除低於 keepFromLevel 的舊快取（避免 localStorage 隨關卡數無限成長）
     * @param {import('./types.js').LevelDefinition} def
     * @param {number} keepFromLevel
     */
    putLevel(def, keepFromLevel) {
        this.writeJson(`${APP_CONFIG.cachePrefix}${def.level}`, def);
        for (const key of this.keysWithPrefix(APP_CONFIG.cachePrefix)) {
            const lvl = Number(key.slice(APP_CONFIG.cachePrefix.length));
            if (!Number.isInteger(lvl) || lvl < keepFromLevel) this.backend.removeItem(key);
        }
    }
    /**
     * v1 存檔遷移：保留關卡進度與設定，盤面進度與舊快取（色票已改版）不沿用
     * @returns {import('./types.js').SaveProfile|null}
     */
    migrateLegacy() {
        const legacy = this.readJson(APP_CONFIG.legacyStorageKey);
        if (!legacy) return null;
        const profile = createDefaultProfile();
        if (isPositiveInt(legacy.activeLevel)) profile.activeLevel = legacy.activeLevel;
        profile.highestLevel = Math.max(profile.activeLevel, isPositiveInt(legacy.highestUnlockedLevel) ? legacy.highestUnlockedLevel : 1);
        if (typeof legacy.colorBlindMode === 'boolean') profile.settings.colorBlind = legacy.colorBlindMode;
        if (typeof legacy.soundEnabled === 'boolean') profile.settings.sound = legacy.soundEnabled;
        profile.seenHelp = true;
        this.saveProfile(profile);
        this.backend.removeItem(APP_CONFIG.legacyStorageKey);
        for (const key of this.keysWithPrefix(APP_CONFIG.legacyCachePrefix)) {
            this.backend.removeItem(key);
        }
        return profile;
    }
}
/**
 * 更新關卡最佳紀錄（步數少者優先，同步數比用時）
 * @param {import('./types.js').SaveProfile} profile
 * @param {number} level
 * @param {{ moves: number, timeMs: number }} result
 * @returns {{ previous: { moves: number, timeMs: number }|null, isRecord: boolean }}
 */
export function updateRecord(profile, level, result) {
    const previous = profile.records[level] || null;
    const isRecord = !previous
        || result.moves < previous.moves
        || (result.moves === previous.moves && result.timeMs < previous.timeMs);
    if (isRecord) profile.records[level] = { moves: result.moves, timeMs: result.timeMs };
    return { previous, isRecord };
}
