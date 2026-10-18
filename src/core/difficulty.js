import { TUBE_SHAPES, REAGENTS } from './constants.js';
export function getLevelParams(level) {
    const L = Math.max(1, Math.floor(level));
    const colorCount = Math.min(REAGENTS.length, Math.floor(3 + 1.8 * Math.log(L)));
    const capacity = L <= 2 ? 3 : 4;
    const emptyTubeCount = 2;
    const tubeCount = colorCount + emptyTubeCount;
    const scrambleDepth = Math.min(160, Math.floor(12 + 18 * Math.log(L + 1) + colorCount * 4));
    const minSteps = Math.max(3, Math.floor(1.8 * colorCount + 1.5 * Math.log(L)));
    const maxSteps = Math.floor(6.0 * colorCount + 12 * Math.log(L + 1) + 8);
    let availableShapes = ['cylinder'];
    if (L >= 4) availableShapes.push('erlenmeyer');
    if (L >= 8) availableShapes.push('bulb');
    if (L >= 14) availableShapes.push('funnel');
    if (L >= 22) availableShapes.push('hourglass');
    return {
        level: L,
        colorCount,
        capacity,
        emptyTubeCount,
        tubeCount,
        scrambleDepth,
        minSteps,
        maxSteps,
        availableShapes
    };
}
export function assignTubeShapes(level, totalTubes, prng) {
    const params = getLevelParams(level);
    const shapes = [];
    for (let i = 0; i < totalTubes; i++) {
        shapes.push(prng.choice(params.availableShapes));
    }
    return shapes;
}