/**
 * 液體解鎖 (Liquid Cipher) 確定性偽隨機數生成器
 * 採用標準 Mulberry32 演算法，支援單一 32-bit 整數種子初始化。
 */

/**
 * 建立 Mulberry32 偽隨機數生成器實例
 * @param {number} seed - 32-bit unsigned integer (0 ~ 4294967295)
 */
export function createPRNG(seed) {
    let s = (seed >>> 0);

    /**
     * 產生 [0, 1) 區間之均勻浮點數
     * @returns {number}
     */
    function next() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * 產生 [min, max] 區間之均勻整數 (包含 min 與 max)
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    function nextInt(min, max) {
        const lo = Math.min(min, max);
        const hi = Math.max(min, max);
        return Math.floor(next() * (hi - lo + 1)) + lo;
    }

    /**
     * 使用 Fisher-Yates 演算法對陣列進行就地（in-place）確定性洗牌
     * @template T
     * @param {T[]} array
     * @returns {T[]}
     */
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = nextInt(0, i);
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }

    /**
     * 從陣列中隨機挑選一個元素
     * @template T
     * @param {T[]} array
     * @returns {T}
     */
    function choice(array) {
        if (array.length === 0) return null;
        const index = nextInt(0, array.length - 1);
        return array[index];
    }

    return {
        next,
        nextInt,
        shuffle,
        choice,
        getSeed: () => (seed >>> 0)
    };
}
