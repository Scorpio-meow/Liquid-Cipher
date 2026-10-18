export function createPRNG(seed) {
    let s = (seed >>> 0);
    function next() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function nextInt(min, max) {
        const lo = Math.min(min, max);
        const hi = Math.max(min, max);
        return Math.floor(next() * (hi - lo + 1)) + lo;
    }
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = nextInt(0, i);
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
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