/**
 * 液體解鎖 (Liquid Cipher) 32-bit 字串雜湊函式
 * 採用標準 FNV-1a (32-bit) 演算法，將字串穩定對應為 unsigned 32-bit 整數。
 */

/**
 * 計算字串的 32-bit FNV-1a 雜湊值
 * @param {string} str - 輸入字串
 * @returns {number} 32-bit unsigned integer (0 ~ 4294967295)
 */
export function hash32(str) {
    let hash = 2166136261; // FNV-1a 32-bit offset basis
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        // 32-bit FNV prime multiplication: hash * 16777619
        // 使用位元運算以避免浮點數溢位
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
}

/**
 * 依據版本、關卡序號與嘗試次數派生確定性 32-bit 種子
 * @param {string} prefix - 根前綴 (e.g. 'liquid-cipher:v1')
 * @param {number} level - 關卡序號 L
 * @param {number} attempt - 嘗試序號 Attempt
 * @returns {number} 32-bit 整數種子
 */
export function deriveLevelSeed(prefix, level, attempt) {
    const rawString = `${prefix}:level:${level}:attempt:${attempt}`;
    return hash32(rawString);
}
