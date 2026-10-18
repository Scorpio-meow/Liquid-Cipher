export function hash32(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
}
export function deriveLevelSeed(prefix, level, attempt) {
    const rawString = `${prefix}:level:${level}:attempt:${attempt}`;
    return hash32(rawString);
}