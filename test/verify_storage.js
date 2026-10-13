/**
 * 存檔層（SaveStore）驗證：容錯讀取、關卡快取修剪、v1 遷移、最佳紀錄
 */
import { SaveStore, createDefaultProfile, updateRecord } from '../src/core/storage.js';
import { APP_CONFIG } from '../src/core/constants.js';
import { generateLevel } from '../src/core/generator.js';
function assert(condition, message) {
    if (!condition) {
        throw new Error(`[Assertion Failed] ${message}`);
    }
}
class FakeStorage {
    constructor(entries = {}) {
        this.map = new Map(Object.entries(entries));
    }
    get length() { return this.map.size; }
    key(i) { return [...this.map.keys()][i] ?? null; }
    getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
    setItem(k, v) { this.map.set(k, String(v)); }
    removeItem(k) { this.map.delete(k); }
}
console.log('--- 正在執行存檔層測試 ---');
// 1. 損毀或缺欄位的存檔不應讓遊戲崩潰
{
    const store = new SaveStore(new FakeStorage({ [APP_CONFIG.storageKey]: '{not json' }));
    // 預期的解析失敗警告改為攔截並檢查，不印到輸出
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args);
    let p;
    try {
        p = store.loadProfile();
    } finally {
        console.warn = originalWarn;
    }
    assert(p.activeLevel === 1 && p.settings.sound === true, '損毀 JSON 應回到預設設定檔');
    assert(warnings.length === 1 && String(warnings[0][0]).includes(APP_CONFIG.storageKey), '損毀 JSON 應發出一次讀取失敗警告');
    const partial = new SaveStore(new FakeStorage({
        [APP_CONFIG.storageKey]: JSON.stringify({ schemaVersion: APP_CONFIG.schemaVersion, activeLevel: 7, settings: { sound: 'yes' }, records: { 3: { moves: 0 } } })
    }));
    const q = partial.loadProfile();
    assert(q.activeLevel === 7 && q.highestLevel === 7, '合法欄位應保留');
    assert(q.settings.sound === true, '型別錯誤的欄位應使用預設值');
    assert(Object.keys(q.records).length === 0, '不合法的紀錄應被丟棄');
    console.log('✓ 損毀存檔容錯驗證通過');
}
// 2. 關卡快取只保留目前及之後的關卡
{
    const backend = new FakeStorage();
    const store = new SaveStore(backend);
    for (const lvl of [1, 2, 3]) store.putLevel(generateLevel(lvl), lvl);
    assert(store.getLevel(1) === null && store.getLevel(2) === null, '舊關卡快取應被清除');
    assert(store.getLevel(3) !== null, '目前關卡快取應存在');
    const def = generateLevel(4);
    def.initialBoard[0].push('crimson', 'crimson', 'crimson', 'crimson', 'crimson');
    store.putLevel(def, 3);
    assert(store.getLevel(4) === null, '形狀不合法的快取不可被讀出');
    console.log('✓ 關卡快取修剪與驗證通過');
}
// 3. v1 存檔遷移
{
    const backend = new FakeStorage({
        [APP_CONFIG.legacyStorageKey]: JSON.stringify({ schemaVersion: 1, activeLevel: 12, highestUnlockedLevel: 12, colorBlindMode: true, soundEnabled: false }),
        [`${APP_CONFIG.legacyCachePrefix}11`]: '{}',
        [`${APP_CONFIG.legacyCachePrefix}12`]: '{}'
    });
    const store = new SaveStore(backend);
    const p = store.loadProfile();
    assert(p.activeLevel === 12 && p.settings.colorBlind === true && p.settings.sound === false, '遷移應保留關卡與設定');
    assert(p.session === null, '舊盤面進度不沿用');
    assert(backend.getItem(APP_CONFIG.legacyStorageKey) === null, '遷移後舊存檔應移除');
    assert(store.keysWithPrefix(APP_CONFIG.legacyCachePrefix).length === 0, '遷移後舊關卡快取應移除');
    assert(new SaveStore(backend).loadProfile().activeLevel === 12, '遷移結果應寫入新存檔');
    console.log('✓ v1 存檔遷移驗證通過');
}
// 4. 最佳紀錄
{
    const p = createDefaultProfile();
    assert(updateRecord(p, 5, { moves: 20, timeMs: 9000 }).isRecord, '首次通關即為紀錄');
    assert(!updateRecord(p, 5, { moves: 21, timeMs: 1000 }).isRecord, '步數較多不算紀錄');
    assert(updateRecord(p, 5, { moves: 20, timeMs: 8000 }).isRecord, '同步數較快算紀錄');
    assert(p.records[5].timeMs === 8000, '紀錄應更新');
    console.log('✓ 最佳紀錄驗證通過');
}
console.log('所有存檔層測試全部成功！');
