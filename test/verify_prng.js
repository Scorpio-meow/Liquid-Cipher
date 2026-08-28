/**
 * 確定性 PRNG 與 Hash 演算法驗證腳本
 */
import { hash32, deriveLevelSeed } from '../src/core/hash.js';
import { createPRNG } from '../src/core/prng.js';
function assert(condition, message) {
    if (!condition) {
        throw new Error(`[Assertion Failed] ${message}`);
    }
}
console.log('--- 正在執行 PRNG 與 Hash 演算法測試 ---');
// 1. 測試 FNV-1a 32-bit 雜湊穩定性
const hash1 = hash32('liquid-cipher:v1:level:37:attempt:1');
const hash2 = hash32('liquid-cipher:v1:level:37:attempt:1');
const hash3 = hash32('liquid-cipher:v1:level:37:attempt:2');
assert(typeof hash1 === 'number', '雜湊結果必須為數值');
assert(hash1 >= 0 && hash1 <= 4294967295, '雜湊結果必須在 unsigned 32-bit 整數範圍內');
assert(hash1 === hash2, '相同字串之雜湊結果必須完全一致');
assert(hash1 !== hash3, '不同字串之雜湊結果必須具備良好分散性');
console.log('✓ FNV-1a 32-bit 雜湊驗證通過');
// 2. 測試 deriveLevelSeed
const seedA = deriveLevelSeed('liquid-cipher:v1', 5, 2);
const seedB = deriveLevelSeed('liquid-cipher:v1', 5, 2);
const seedC = deriveLevelSeed('liquid-cipher:v1', 6, 2);
assert(seedA === seedB, '相同關卡與 attempt 必須派生相同種子');
assert(seedA !== seedC, '不同關卡必須派生不同種子');
console.log('✓ 種子派生函式驗證通過');
// 3. 測試 Mulberry32 PRNG 數列重現性
const prng1 = createPRNG(seedA);
const prng2 = createPRNG(seedA);
for (let i = 0; i < 50; i++) {
    const val1 = prng1.next();
    const val2 = prng2.next();
    assert(val1 === val2, `PRNG 數列在索引 ${i} 不一致`);
    assert(val1 >= 0 && val1 < 1, `PRNG 數值 ${val1} 超出 [0, 1) 範圍`);
}
for (let i = 0; i < 20; i++) {
    const int1 = prng1.nextInt(10, 50);
    const int2 = prng2.nextInt(10, 50);
    assert(int1 === int2, `nextInt 數列在索引 ${i} 不一致`);
    assert(int1 >= 10 && int1 <= 50, `nextInt 數值 ${int1} 超出 [10, 50] 範圍`);
}
const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
prng1.shuffle(arr1);
prng2.shuffle(arr2);
assert(JSON.stringify(arr1) === JSON.stringify(arr2), '洗牌結果在相同種子下必須完全一致');
console.log('✓ Mulberry32 確定性數列與洗牌驗證通過');
console.log('所有 PRNG 與 Hash 測試全部成功！');