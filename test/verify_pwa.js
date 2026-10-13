/**
 * PWA 設定與 Service Worker 靜態快取驗證測試
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
console.log('--- 正在執行 PWA 設定與離線快取驗證測試 ---');
const projectRoot = resolve('.');
// 測試 1: 驗證 manifest.webmanifest 正確性
{
    const manifestPath = join(projectRoot, 'manifest.webmanifest');
    if (!existsSync(manifestPath)) {
        throw new Error('找不到 manifest.webmanifest 檔案！');
    }
    const content = readFileSync(manifestPath, 'utf-8');
    let manifest;
    try {
        manifest = JSON.parse(content);
    } catch (e) {
        throw new Error(`manifest.webmanifest 不是合法的 JSON 格式: ${e.message}`);
    }
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'background_color', 'theme_color', 'icons'];
    for (const field of requiredFields) {
        if (!manifest[field]) {
            throw new Error(`manifest.webmanifest 缺少必填欄位: ${field}`);
        }
    }
    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
        throw new Error('manifest.webmanifest 必須包含至少一個圖標！');
    }
    for (const icon of manifest.icons) {
        const iconPath = join(projectRoot, icon.src);
        if (!existsSync(iconPath)) {
            throw new Error(`Manifest 參照的圖標路徑不存在: ${icon.src}`);
        }
    }
    console.log(`✓ Web App Manifest 格式與 ${manifest.icons.length} 個圖標路徑檢驗通過`);
}
// 測試 2: 驗證 sw.js 與預快取資源清單
{
    const swPath = join(projectRoot, 'sw.js');
    if (!existsSync(swPath)) {
        throw new Error('找不到 sw.js 檔案！');
    }
    const swContent = readFileSync(swPath, 'utf-8');
    // 解析 PRECACHE_ASSETS 陣列
    const match = swContent.match(/const\s+PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
    if (!match) {
        throw new Error('無法從 sw.js 解析 PRECACHE_ASSETS 清單！');
    }
    const rawList = match[1];
    const assetPaths = rawList
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(s => s && s !== './');
    for (const relPath of assetPaths) {
        const fullPath = join(projectRoot, relPath);
        if (!existsSync(fullPath)) {
            throw new Error(`sw.js 預快取清單中的檔案不存在: ${relPath}`);
        }
    }
    // 反向檢查：src/ 下每個模組都必須在預快取清單中，否則離線時會載入失敗
    const srcFiles = readdirSync(join(projectRoot, 'src'), { recursive: true })
        .map(f => `./src/${String(f).split('\\').join('/')}`)
        .filter(f => f.endsWith('.js') || f.endsWith('.css'));
    for (const f of srcFiles) {
        if (!assetPaths.includes(f)) {
            throw new Error(`sw.js 預快取清單缺少模組: ${f}`);
        }
    }
    console.log(`✓ Service Worker 預快取清單中全部 ${assetPaths.length} 個核心資源均確認存在，且涵蓋 src/ 全部 ${srcFiles.length} 個模組`);
}
// 測試 3: 驗證 index.html 中的 PWA 元素宣告
{
    const htmlPath = join(projectRoot, 'index.html');
    const html = readFileSync(htmlPath, 'utf-8');
    if (!html.includes('manifest.webmanifest')) {
        throw new Error('index.html 缺少 manifest.webmanifest 連結！');
    }
    if (!html.includes('id="btn-install"')) {
        throw new Error('index.html 缺少 btn-install 安裝按鈕！');
    }
    if (!html.includes('id="update-banner"')) {
        throw new Error('index.html 缺少 update-banner 更新提示元件！');
    }
    console.log('✓ index.html 的 PWA 元件與 Manifest 宣告檢驗通過');
}
console.log('所有 PWA 自動化測試全部成功！');