import { REAGENTS } from './constants.js';
const REAGENT_MAP = new Map(REAGENTS.map(r => [r.id, r]));
export function getReagentById(id) {
    const r = REAGENT_MAP.get(id);
    if (!r) {
        throw new Error(`未知的試劑 ID: ${id}`);
    }
    return r;
}
export function getReagentRgbaStr(id, alpha = 1.0) {
    const r = getReagentById(id);
    return `rgba(${r.rgb[0]}, ${r.rgb[1]}, ${r.rgb[2]}, ${alpha})`;
}
export function getRelativeLuminance(rgb) {
    const sRGB = rgb.map(val => {
        const v = val / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}
export function getContrastRatio(rgb1, rgb2) {
    const lum1 = getRelativeLuminance(rgb1);
    const lum2 = getRelativeLuminance(rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}
export function getAccessibleTextColor(id) {
    const r = getReagentById(id);
    const whiteRgb = [255, 255, 255];
    const darkRgb = [15, 23, 42];
    const ratioWhite = getContrastRatio(r.rgb, whiteRgb);
    const ratioDark = getContrastRatio(r.rgb, darkRgb);
    return ratioWhite >= ratioDark ? '#FFFFFF' : '#0F172A';
}
export function getReagentGlyph(id) {
    return getReagentById(id).glyph;
}