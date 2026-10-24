# 液體解鎖 (Liquid Cipher) - 實驗室色彩解密矩陣

[![Language](https://img.shields.io/badge/Language-HTML5%20%2F%20CSS3%20%2F%20JavaScript-blue)](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript)
[![PWA](https://img.shields.io/badge/PWA-Installable%20%26%20Offline-blueviolet)](./manifest.webmanifest)
[![Architecture](https://img.shields.io/badge/Architecture-Native%20ES%20Modules-purple)](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Guide/Modules)
[![Graphics](https://img.shields.io/badge/Graphics-High--DPI%20Canvas%202D-red)](https://developer.mozilla.org/zh-TW/docs/Web/API/Canvas_API)
[![Worker](https://img.shields.io/badge/Computation-Dedicated%20Web%20Worker-teal)](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
[![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API%20Synthesis-orange)](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Audio_API)
[![Runtime](https://img.shields.io/badge/Runtime-Bun%20Compatible-black)](https://bun.sh)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.2%20AA%20Target-success)](./ACCESSIBILITY.md)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

液體解鎖 (Liquid Cipher) 是一款無限關卡的 Water Sort 試劑分離解謎網頁遊戲：把混在一起的試劑倒回各自的試管，讓每支試管只剩單一顏色。

每一關都由背景 Web Worker 以廣度優先搜尋（BFS）驗證可解並算出最少步數，作為步數評級與提示的基準。專案以原生 ES Modules、Canvas 2D 與 Web Audio 寫成，零建置、零外部框架，並支援 PWA 離線遊玩與安裝。

---

## 快速開始

本專案為支援 PWA 的零建置單頁應用程式（SPA），支援以下方式啟動與運行：

### 方法一：使用 Bun 靜態伺服器（推薦）

若您已安裝 Bun，可在專案根目錄下啟動本地靜態伺服器：

```bash
bunx serve .
```

伺服器啟動後，依據終端機輸出的網址（通常為 `http://localhost:3000`）在瀏覽器中開啟即可。

### 方法二：PWA 應用程式安裝至桌面 / 行動裝置

1. 在 Chrome / Edge / Safari 中開啟遊戲網址。
2. 點擊右上角的「安裝」按鈕（或瀏覽器網址列的安裝圖示）。
3. 安裝後以獨立視窗開啟，可離線遊玩。

### 方法三：直接瀏覽器開啟

直接使用支援原生 ES Modules 與 Web Worker 的現代瀏覽器開啟專案目錄下的 `index.html` 檔案。

---

## 遊戲玩法

### 1. 傾倒規則

- **拿起與倒入**：點一支試管拿起，再點另一支倒入；點同一支放下。
- **同色相容**：只能倒進空管，或頂層顏色相同、還有空間的試管。
- **連續倒水**：頂部連續的同色液層會一起倒過去，直到目標管裝滿或該色倒完。
- **通關條件**：每支試管都只剩單一顏色（或清空）。
- **操作回饋**：不合法的倒入會讓目標管搖晃並以提示訊息說明原因，同時改為拿起被點的那支；傾倒動畫進行中的點選會排隊，動畫結束後依序執行。
- **卡關偵測**：盤面已無任何合法步時會提示復原或重置；提示功能也會判斷目前盤面是否已無解。

### 2. 鍵盤快捷鍵

| 快捷鍵 | 動作 |
| :--- | :--- |
| `1` ~ `9`、`0` | 選擇第 1 ~ 10 支試管 |
| `←` `→` `↑` `↓` | 移動游標（上下跨排） |
| `Enter` / `Space` | 拿起 / 倒入游標所在試管；通關畫面中進入下一關 |
| `Z` 或 `Ctrl+Z` | 復原 |
| `Y` 或 `Ctrl+Shift+Z` | 重做 |
| `R` | 重置本關（通關畫面中為重玩本關） |
| `H` | 提示下一步 |
| `C` | 色盲符號 |
| `M` | 音效開關 |
| `?` 或 `/` | 玩法說明 |
| `Esc` | 放下試管 / 關閉說明 |

### 3. 評級

用最少步數完成得 **S**，多出 3 步以內得 **A**，其餘為 **B**。通關畫面會顯示步數、最少步數、用時、提示次數與本關最佳紀錄。

---

## 介面設計

- **單一強調色**：深色綠灰中性底搭配一個薄荷強調色，只用在選取、提示與主要按鈕；字型為 Geist / Geist Mono，數字一律等寬對齊。
- **12 色試劑重新調色**：色相與明度刻意拉開（紅、藍、黃、綠、紫、橙、青、粉、黃綠、赭棕、珍珠白、石板灰），同盤 12 色也能分辨。
- **色盲符號**：每種試劑對應一個形狀（圓、三角、方、菱形、星、十字、六角、環、叉、橫槓、箭頭、月牙），直接畫在每一格液體上。
- **自適應排版**：依舞台大小在 1 ~ 3 排之間挑出讓試管最大的排法；點擊熱區以格子切分整個舞台，手機上不必精準點中玻璃。
- **傾倒動畫**：來源管移到目標管上方、傾斜超過水平後倒出，液面依比例連續增減；完成的試管會蓋上瓶塞。
- **單一工具列**：桌機與手機共用同一組復原 / 重做 / 提示 / 重置按鈕，手機上固定於底部並避開安全區。
- **原生對話框**：通關與說明使用 `<dialog>`，焦點圈限與 Esc 由瀏覽器處理；手機上以底部抽屜呈現。
- **無障礙**：螢幕閱讀器播報每一步與提示內容、鍵盤游標、跳至遊戲區連結、`prefers-reduced-motion` 時關閉粒子並縮短動畫。

---

## 核心演算法與生成管線機制

### 1. 單一路徑無限線性闖關

- **嚴格線性推進**：不提供手動選關、關卡跳轉或難度降級。
- **預先生成**：載入一關後，背景立即生成下一關，通關後免等待。
- **進度保存**：存檔只記錄移動序列；讀檔時由初始盤面逐步重播驗證，任何一步不合法即視為存檔無效並從頭開始。關卡快取只保留目前與下一關，不會隨關卡數無限成長。
- **v1 存檔遷移**：舊版存檔的關卡進度與設定會自動沿用（色票改版，舊盤面進度不沿用）。

### 2. 連續數學難度曲線 (非遞減特性)

關卡難度隨關卡序號 $L \ge 1$ 依下列連續數學公式平滑非遞減遞進：

- **色彩數量 $C(L)$**：$C(L) = \min(12, \lfloor 3 + 1.8 \times \ln(L) \rfloor)$
- **試管容量 $V(L)$**：$L \le 2$ 為 $3$ 格；$L \ge 3$ 為標準 $4$ 格。
- **緩衝空管數 $E(L)$**：固定為 $2$ 支空管。
- **總試管數 $T(L)$**：$T(L) = C(L) + E(L)$。
- **置亂深度參數 $S(L)$**：$S(L) = \min(160, \lfloor 12 + 18 \times \ln(L + 1) + C(L) \times 4 \rfloor)$（保留於難度參數；目前候選盤面以全色塊洗牌產生，不使用此值）。
- **預期最少解法步數區間 $[MinSteps(L), MaxSteps(L)]$**：
  - $MinSteps(L) = \max(3, \lfloor 1.8 \times C(L) + 1.5 \times \ln(L) \rfloor)$
  - $MaxSteps(L) = \lfloor 6.0 \times C(L) + 12 \times \ln(L + 1) + 8 \rfloor$
- **幾何管型解鎖**：隨關卡推進依序解鎖圓柱管（Cylinder）、錐形瓶（Erlenmeyer）、圓底燒瓶（Bulb）、漏斗管（Funnel）與沙漏管（Hourglass）。

### 3. 發布前三重門禁與跨裝置確定性

所有發布給玩家的盤面，均由 32-bit FNV-1a Hash 與 Mulberry32 PRNG 派生確定性種子，並在 Web Worker 中通過發布前三重門禁驗證：

1. **結構合法性檢查**：每種色彩容量完全平衡、空管數正確、盤面非初始已通關狀態。
2. **Exact Solver 最優性證明**：以廣度優先搜尋（BFS）探索狀態空間，證明存在合法解法且最優性已證明（`optimalityProven: true`）。
3. **目標解法步數區間驗證**：最短解法步數必須嚴格落在 $[MinSteps(L), MaxSteps(L)]$ 區間內。

任何一道門禁未通過或節點預算超限，生成器會遞增 Attempt 重新生成；超過最大嘗試次數（120 次）時改用下方的備援配方。

### 4. 雙層 Fallback 備援配方

- **固定里程碑備援**：預置第 1、2、5、10 關的盤面與最少步數（由測試確保與求解器結果一致）。
- **動態派生備援**：其餘關卡先嘗試確定性洗牌盤面，無法證明可解時改用構造上必定可解的輪替排列盤面；只有在求解器證明成功時才填入最少步數，否則顯示「—」且不評級。
- **逾時保護**：背景運算逾時會終止並重建 Worker；關卡載入失敗時顯示錯誤與重試按鈕。

---

## 模組架構說明

```text
Liquid-Cipher/
├── index.html                  # 語義化 HTML 骨架、PWA 宣告、<dialog> 對話框
├── manifest.webmanifest        # PWA Web App Manifest
├── sw.js                       # Service Worker 離線快取與版本更新
├── logo/                       # 應用圖標與 Favicon
├── src/
│   ├── main.js                 # 進入點：協調對局、存檔、背景運算、渲染與介面
│   ├── pwa.js                  # Service Worker 註冊、安裝按鈕、新版本提示
│   ├── styles/
│   │   ├── main.css            # 設計 token、字型、版面骨架
│   │   └── components.css      # 頂列、狀態列、舞台、工具列、對話框、提示訊息
│   ├── core/                   # 純邏輯，不碰 DOM
│   │   ├── constants.js        # 試劑色譜、管型、求解與渲染參數
│   │   ├── board.js            # 傾倒規則、通關判定、盤面工具（純函式）
│   │   ├── session.js          # 對局狀態機：移動歷史、復原 / 重做、快照重播、計時、評級
│   │   ├── stopwatch.js        # 無漂移碼表
│   │   ├── storage.js          # 存檔層：設定檔驗證、關卡快取修剪、v1 遷移、最佳紀錄
│   │   ├── hash.js / prng.js   # FNV-1a 雜湊與 Mulberry32 PRNG
│   │   ├── color.js            # 色彩對比與色盲符號
│   │   ├── difficulty.js       # 難度參數與步數區間
│   │   ├── solver.js           # BFS Exact Solver（父節點回溯）與提示求解
│   │   ├── generator.js        # 三重門禁關卡生成
│   │   ├── fallbackLevels.js   # 備援關卡
│   │   └── tasks.js            # 背景運算任務表（Worker 與主執行緒共用）
│   ├── services/
│   │   └── solverClient.js     # Worker RPC：逾時重建、無 Worker 時主執行緒執行
│   ├── workers/
│   │   └── solverWorker.js     # 背景 Web Worker
│   ├── render/
│   │   ├── layout.js           # 自適應 1 ~ 3 排排版與點擊判定（純函式）
│   │   ├── shapes.js           # 5 種玻璃器皿輪廓
│   │   ├── tubePainter.js      # 單支試管、液柱、瓶塞、色盲符號
│   │   └── stage.js            # 畫布尺寸、繪製迴圈與所有動畫
│   ├── audio/
│   │   └── soundSynth.js       # Web Audio 程序化音效
│   └── ui/
│       ├── hud.js              # 狀態列、工具列狀態、舞台遮罩、提示訊息
│       ├── dialogs.js          # 通關與說明對話框
│       └── input.js            # 指標與鍵盤輸入 → 語意動作
└── test/
    ├── verify_prng.js          # PRNG 與雜湊
    ├── verify_difficulty.js    # 難度曲線非遞減 (L = 1 ~ 100)
    ├── verify_pipeline.js      # 求解器與三重門禁生成
    ├── verify_bugfixes.js      # 回歸測試（含里程碑最少步數）
    ├── verify_session.js       # 對局狀態機、規則、快照竄改防護、評級
    ├── verify_storage.js       # 存檔容錯、快取修剪、v1 遷移、最佳紀錄
    ├── verify_layout.js        # 各尺寸排版不重疊、不出界、全部可點
    └── verify_pwa.js           # Manifest 與 Service Worker 預快取涵蓋所有模組
```

---

## 驗證測試

```bash
bun test/verify_prng.js
bun test/verify_difficulty.js
bun test/verify_pipeline.js
bun test/verify_bugfixes.js
bun test/verify_session.js
bun test/verify_storage.js
bun test/verify_layout.js
bun test/verify_pwa.js
```

---

## 參與貢獻

歡迎提交 Issue 或 Pull Request！開始之前請先閱讀：

- [貢獻指南](./CONTRIBUTING.md)：開發環境、Commit 規範與 Pull Request 流程
- [行為準則](./CODE_OF_CONDUCT.md)：參與社群的互動規範
- [安全性政策](./SECURITY.md)：如何私下回報安全性漏洞
- [無障礙聲明](./ACCESSIBILITY.md)：支援環境、已知限制與回報管道

---

## 授權條款

本專案採用 [MIT License](./LICENSE) 授權開源。
