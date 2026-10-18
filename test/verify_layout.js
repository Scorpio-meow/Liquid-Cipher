import { computeStageLayout, hitTestLayout, splitRows } from '../src/render/layout.js';
import { RENDER_CONFIG } from '../src/core/constants.js';
function assert(condition, message) {
    if (!condition) {
        throw new Error(`[Assertion Failed] ${message}`);
    }
}
console.log('--- 正在執行排版與點擊判定測試 ---');
assert(JSON.stringify(splitRows(7, 2)) === '[4,3]', '7 支分 2 排應為 4 + 3');
assert(JSON.stringify(splitRows(14, 3)) === '[5,5,4]', '14 支分 3 排應為 5 + 5 + 4');
const viewports = [[343, 420], [375, 520], [768, 600], [1060, 520], [1400, 700], [320, 300]];
for (const [w, h] of viewports) {
    for (let n = 5; n <= 14; n++) {
        const shapes = new Array(n).fill('cylinder');
        const layout = computeStageLayout(n, shapes, w, h, 4);
        assert(layout.tubes.length === n, `${w}x${h} 應排出 ${n} 支`);
        for (const t of layout.tubes) {
            assert(t.x - t.width / 2 >= 0 && t.x + t.width / 2 <= w, `${w}x${h} n=${n} 試管 ${t.id} 水平出界`);
            assert(t.y - t.height - layout.lift >= -1, `${w}x${h} n=${n} 試管 ${t.id} 升起後超出上緣`);
            assert(t.y + RENDER_CONFIG.labelSpace <= h + 1, `${w}x${h} n=${n} 試管 ${t.id} 編號超出下緣`);
            const midY = t.y - t.height / 2;
            assert(hitTestLayout(layout, t.x, midY) === t.id, `${w}x${h} n=${n} 點擊試管 ${t.id} 中心應命中自己`);
        }
        for (let i = 1; i < layout.tubes.length; i++) {
            const a = layout.tubes[i - 1];
            const b = layout.tubes[i];
            if (a.row === b.row) assert(b.x - a.x >= a.width, `${w}x${h} n=${n} 試管 ${a.id} 與 ${b.id} 重疊`);
        }
    }
}
console.log(`✓ ${viewports.length} 種視窗 × 管數 5~14 排版不重疊、不出界且全部可點擊`);
console.log('所有排版測試全部成功！');