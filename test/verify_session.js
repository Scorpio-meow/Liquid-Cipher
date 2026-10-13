/**
 * 對局狀態機（GameSession）與盤面規則驗證
 */
import { GameSession, computeRank } from '../src/core/session.js';
import { evaluatePour, applyMoveInPlace, revertMoveInPlace, cloneBoard, hasAnyLegalMove } from '../src/core/board.js';
import { generateLevel } from '../src/core/generator.js';
import { Stopwatch } from '../src/core/stopwatch.js';
function assert(condition, message) {
    if (!condition) {
        throw new Error(`[Assertion Failed] ${message}`);
    }
}
console.log('--- 正在執行對局狀態機與規則測試 ---');
// 1. 傾倒規則與拒絕原因
{
    const board = [['crimson', 'cobalt', 'cobalt'], ['cobalt'], ['crimson', 'crimson', 'crimson', 'solar'], []];
    assert(evaluatePour(board, 4, 0, 0).reason === 'same-tube', '同管應拒絕');
    assert(evaluatePour(board, 4, 3, 0).reason === 'source-empty', '空來源應拒絕');
    assert(evaluatePour(board, 4, 0, 2).reason === 'target-full', '滿目標應拒絕');
    assert(evaluatePour(board, 4, 2, 1).reason === 'color-mismatch', '顏色不符應拒絕');
    const ok = evaluatePour(board, 4, 0, 1);
    assert(ok.ok && ok.move.amount === 2 && ok.move.colorId === 'cobalt', '連續同色應一起倒入');
    const before = cloneBoard(board);
    applyMoveInPlace(board, ok.move);
    revertMoveInPlace(board, ok.move);
    assert(JSON.stringify(board) === JSON.stringify(before), '撤銷必須是套用的逆運算');
    assert(!hasAnyLegalMove([['crimson', 'cobalt'], ['cobalt', 'crimson']], 2), '兩支滿管且頂色不同時無合法步');
    console.log('✓ 傾倒規則、拒絕原因與逆運算驗證通過');
}
// 2. 倒水 / 復原 / 重做 / 版本號 / 事件
{
    let clock = 0;
    const session = new GameSession(() => clock);
    const def = generateLevel(1);
    let events = 0;
    session.addEventListener('change', () => events++);
    session.load(def, null);
    const path = def.optimalPath;
    assert(Array.isArray(path) && path.length === def.knownOptimalSteps, '生成的關卡必須附帶最短路徑');
    assert(!session.stopwatch.running, '尚未移動前不應計時');
    const v0 = session.version;
    session.pour(path[0].from, path[0].to);
    assert(session.version > v0, '倒水後版本號必須遞增');
    assert(session.stopwatch.running, '首次移動後開始計時');
    clock = 1000;
    session.undo();
    assert(session.moves === 0 && session.canRedo, '復原後步數歸零且可重做');
    session.redo();
    assert(session.moves === 1 && !session.canRedo, '重做後回到 1 步');
    for (const m of path.slice(1)) {
        const res = session.pour(m.from, m.to);
        assert(res.ok, '依最短路徑每一步都必須合法');
    }
    clock = 5000;
    assert(session.isSolved, '依最短路徑走完必須通關');
    assert(!session.stopwatch.running && session.stopwatch.elapsedMs === 1000, '通關當下停止計時');
    assert(session.rank === 'S', '最少步數通關必須為 S');
    assert(session.pour(0, 1).ok === false, '通關後不可再倒水');
    assert(session.undo() === null, '通關後不可復原');
    assert(events >= path.length + 3, '每次狀態變化都要發出 change 事件');
    console.log('✓ 倒水、復原、重做、計時與通關判定驗證通過');
}
// 3. 快照重播還原與竄改防護
{
    const def = generateLevel(3);
    const a = new GameSession(() => 0);
    a.load(def, null);
    const path = def.optimalPath;
    a.pour(path[0].from, path[0].to);
    a.pour(path[1].from, path[1].to);
    a.undo();
    a.recordHintUsed();
    const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = new GameSession(() => 0);
    assert(b.load(def, snap) === true, '合法快照必須成功還原');
    assert(JSON.stringify(b.board) === JSON.stringify(a.board), '還原後盤面必須一致');
    assert(b.canRedo && b.hintsUsed === 1, '重做堆疊與提示次數必須還原');
    const tampered = JSON.parse(JSON.stringify(snap));
    tampered.history[0].amount = 99;
    const c = new GameSession(() => 0);
    assert(c.load(def, tampered) === false && c.moves === 0, '被竄改的快照必須被拒絕並從頭開始');
    const otherSeed = { ...snap, derivedSeed: snap.derivedSeed + 1 };
    assert(new GameSession(() => 0).load(def, otherSeed) === false, '種子不符的快照必須被拒絕');
    console.log('✓ 快照重播還原與竄改防護驗證通過');
}
// 4. 評級與碼表
{
    assert(computeRank(10, 10) === 'S', '等於最少步數為 S');
    assert(computeRank(13, 10) === 'A', '超出 3 步內為 A');
    assert(computeRank(14, 10) === 'B', '超出 3 步以上為 B');
    assert(computeRank(5, null) === null, '最少步數未證明時不評級');
    let t = 0;
    const sw = new Stopwatch(() => t);
    sw.start(); t = 300; sw.pause(); t = 1000; sw.start(); t = 1200;
    assert(sw.elapsedMs === 500, '碼表暫停期間不累計');
    console.log('✓ 評級與碼表驗證通過');
}
console.log('所有對局狀態機測試全部成功！');
