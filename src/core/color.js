/**
 * 液體解鎖 (Liquid Cipher) 色彩與試劑工具模組
 */
import { REAGENTS } from './constants.js';
// 建立 ID 快速索引表
const REAGENT_MAP = new Map(REAGENTS.map(r => [r.id, r]));
/**
 * 依據 ID 取得試劑定義
 * @param {string} id
 * @returns {import('./types.js').Reagent}
 */
export function getReagentById(id) {
    const r = REAGENT_MAP.get(id);
    if (!r) {
        throw new Error(`未知的試劑 ID: ${id}`);
    }
    return r;
}
/**
 * 將試劑 ID 轉換為 RGBA 字串
 * @param {string} id - 試劑 ID
 * @param {number} [alpha=1.0] - 透明度 (0 ~ 1)
 * @returns {string} rgba(...)
 */
export function getReagentRgbaStr(id, alpha = 1.0) {
    const r = getReagentById(id);
    return `rgba(${r.rgb[0]}, ${r.rgb[1]}, ${r.rgb[2]}, ${alpha})`;
}
/**
 * 計算兩種色彩之相對亮度
 * @param {number[]} rgb - [R, G, B]
 * @returns {number} 0 ~ 1
 */
export function getRelativeLuminance(rgb) {
    const sRGB = rgb.map(val => {
        const v = val / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}
/**
 * 計算前景色與背景色對比度 (符合 WCAG 2.1 標準)
 * @param {number[]} rgb1
 * @param {number[]} rgb2
 * @returns {number} Contrast ratio (1 ~ 21)
 */
export function getContrastRatio(rgb1, rgb2) {
    const lum1 = getRelativeLuminance(rgb1);
    const lum2 = getRelativeLuminance(rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}
/**
 * 取得適合在該試劑顏色背景上的文字顏色 ('#FFFFFF' 或 '#0F172A')
 * @param {string} id - 試劑 ID
 * @returns {string} HEX 色碼
 */
export function getAccessibleTextColor(id) {
    const r = getReagentById(id);
    const whiteRgb = [255, 255, 255];
    const darkRgb = [15, 23, 42]; // slate-900
    const ratioWhite = getContrastRatio(r.rgb, whiteRgb);
    const ratioDark = getContrastRatio(r.rgb, darkRgb);
    return ratioWhite >= ratioDark ? '#FFFFFF' : '#0F172A';
}
/**
 * 取得該試劑對應之色盲輔助形狀符號
 * @param {string} id - 試劑 ID
 * @returns {string} 形狀代碼 (e.g. 'circle')
 */
export function getReagentGlyph(id) {
    return getReagentById(id).glyph;
}
