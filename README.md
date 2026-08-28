# 液體解鎖 (Liquid Cipher) - 實驗室色彩解密矩陣

[![Language](https://img.shields.io/badge/Language-HTML5%20%2F%20CSS3%20%2F%20JavaScript-blue)](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript)
[![PWA](https://img.shields.io/badge/PWA-Installable%20%26%20Offline-blueviolet)](./manifest.webmanifest)
[![Architecture](https://img.shields.io/badge/Architecture-Native%20ES%20Modules-purple)](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Guide/Modules)
[![Graphics](https://img.shields.io/badge/Graphics-High--DPI%20Canvas%202D-red)](https://developer.mozilla.org/zh-TW/docs/Web/API/Canvas_API)
[![Worker](https://img.shields.io/badge/Computation-Dedicated%20Web%20Worker-teal)](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
[![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API%20Synthesis-orange)](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Audio_API)
[![Runtime](https://img.shields.io/badge/Runtime-Bun%20Compatible-black)](https://bun.sh)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.1%20Compliant-success)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

液體解鎖 (Liquid Cipher) 是一款結合 Cyber-Lab Dark Tech 視覺風格、High-DPI HTML5 Canvas 2D 流體渲染、Web Audio API 程序化音效合成與 PWA 漸進式離線安裝能力的單一路徑無限線性 Water Sort 化學試劑解密網頁遊戲。

玩家扮演尖端實驗室研究員，依循色彩分離排序邏輯，將各個試管中的化學試劑進行整理，使每個試管均回歸單一純色或完全清空。本專案完全基於原生現代網頁技術開發，零外部建置或框架依賴，透過獨立 Web Worker 在背景執行狀態空間搜尋（BFS Exact Solver）與關卡生成管線，並支援 Service Worker 100% 離線即開即玩與獨立桌面/手機應用程式安裝。

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
2. 點擊頂部操作列的「安裝 APP」按鈕（或瀏覽器網址列的安裝圖示）。
3. 即可將 Liquid Cipher 安裝為原生獨立視窗應用程式，享有完整離線遊玩與沉浸式全螢幕操作體驗。

### 方法三：直接瀏覽器開啟

直接使用支援原生 ES Modules 與 Web Worker 的現代瀏覽器開啟專案目錄下的 `index.html` 檔案。

---

## 遊戲玩法與互動協議

### 1. 試劑傾倒基本法則

- **同色相容**：僅能將試劑傾倒至頂層顏色完全相同的目標試管中，或任意完全清空的空管。
- **連續倒水**：傾倒時系統將自動搬移來源試管頂部所有連續相連的同色液層，直至目標管裝滿或同色液層轉移完畢。
- **容量限制**：目標試管必須具備足夠剩餘格數，無法超出試管容量上限。
- **通關條件**：所有試劑皆已依色彩歸類於獨立試管，且盤面上無任何試管存在雜色混合。

### 2. 全套鍵盤快捷鍵

| 快捷鍵 | 動作說明 |
| :--- | :--- |
| `Z` 或 `Ctrl+Z` | 復原上一步動作 (Undo) |
| `Y` 或 `Ctrl+Y` | 重做下一步動作 (Redo) |
| `R` | 重置本關卡至初始狀態 / 勝利後再次挑戰本關 (Restart) |
| `H` | 智能提示最佳移動路徑 (Hint) |
| `C` | 切換色盲無障礙符號標籤 (Colorblind Mode) |
| `M` | 切換程序化音效靜音/開啟 (Mute Sound) |
| `1` ~ `9` | 依序快速選取對應編號的試管 |
| `?` 或 `/` | 開啟 / 關閉實驗室操作協議說明彈窗 |
| `Enter` / `Space` | 通關後一鍵解鎖並進入下一關 |
| `Escape` | 取消當前試管選取 / 關閉開啟的彈窗 |

---

## UI/UX 設計系統與視覺特色

依據 `ui-ux-pro-max` 設計系統規範，專案採用 Cyber-Lab Dark Tech 設計語彙：

### 1. 即時遙測 Bento HUD 儀表欄
- **SECTOR 關卡矩陣卡**：即時呈現關卡序號與當前難度規格（如「3 色 · 5 管」）。
- **效率計量 (Efficiency / Par)**：即時對比「當前步數 / 理論最少步數」，並動態標註 `OPTIMAL`（最佳解）、`PAR`（平標準桿）或超額步數。
- **無漂移高精度碼表 (CHRONOMETER)**：基於時間戳差值精確計算用時，等寬數位對齊（`tabular-nums`）杜絕抖動，並於通關或加載時自動同步。

### 2. 幾何玻璃儀器與流體物理引擎
- **實驗室隔離艙標記**：畫布外圍具備科技邊框標記（`┌ ┐ └ ┘`）與頂部狀態條。
- **置管台與能量光環**：每支試管底部具備金屬置管台刻度環與投影陰影；選取試管時投射脈衝光環與平滑懸浮。
- **流體分層與表面張力動態**：液體立體漸層增強深度，頂部液面呈現平滑正弦諧波微波瀾（Meniscus）。
- **智能提示動態導引光弧**：觸發提示時，來源管與目標管之間繪製帶有流動粒子與方向箭頭的拋物線導引光弧。
- **衝擊水花與全息星芒粒子**：傾倒射流具備光暈與液面落點水花微粒子，通關時爆發全息星芒與彩色紙屑。

### 3. PWA 漸進式離線體驗與無障礙
- **Service Worker 離線快取**：採用 Cache-First 搭配 Stale-While-Revalidate，離線秒開，連線自動檢查更新並提供浮動更新通知列。
- **Web Audio API 合成**：所有音效均由程式碼即時計算振盪器頻率合成，無任何外部音檔載入負擔。
- **無障礙支援**：色彩對比度符合 WCAG 2.1 標準；提供色盲符號晶片標籤（R1, B2, Y3...）；行動端支援微觸覺震動反饋（`navigator.vibrate`）。

---

## 核心演算法與生成管線機制

### 1. 單一路徑無限線性闖關

- **嚴格線性推進**：不提供手動選關、關卡跳轉或難度降級。
- **無縫自動解鎖**：成功完成當前關卡 $L$ 後，系統自動生成並載入 $L+1$ 關卡。
- **進度自動保存**：透過 `localStorage` 即時持久化玩家當前關卡、已解鎖最高關卡、當前盤面與已驗證關卡定義快取。

### 2. 連續數學難度曲線 (非遞減特性)

關卡難度隨關卡序號 $L \ge 1$ 依下列連續數學公式平滑非遞減遞進：

- **色彩數量 $C(L)$**：$C(L) = \min(12, \lfloor 3 + 1.8 \times \ln(L) \rfloor)$
- **試管容量 $V(L)$**：$L \le 2$ 為 $3$ 格；$L \ge 3$ 為標準 $4$ 格。
- **緩衝空管數 $E(L)$**：固定為 $2$ 支空管。
- **總試管數 $T(L)$**：$T(L) = C(L) + E(L)$。
- **逆向置亂深度 $S(L)$**：$S(L) = \min(160, \lfloor 12 + 18 \times \ln(L + 1) + C(L) \times 4 \rfloor)$。
- **預期最少解法步數區間 $[MinSteps(L), MaxSteps(L)]$**：
  - $MinSteps(L) = \max(3, \lfloor 1.8 \times C(L) + 1.5 \times \ln(L) \rfloor)$
  - $MaxSteps(L) = \lfloor 6.0 \times C(L) + 12 \times \ln(L + 1) + 8 \rfloor$
- **幾何管型解鎖**：隨關卡推進依序解鎖圓柱管（Cylinder）、錐形瓶（Erlenmeyer）、圓底燒瓶（Bulb）、漏斗管（Funnel）與沙漏管（Hourglass）。

### 3. 發布前三重門禁與跨裝置確定性

所有發布給玩家的盤面，均由 32-bit FNV-1a Hash 與 Mulberry32 PRNG 派生確定性種子，並在 Web Worker 中通過發布前三重門禁驗證：

1. **結構合法性檢查**：每種色彩容量完全平衡、空管數正確、盤面非初始已通關狀態。
2. **Exact Solver 最優性證明**：以廣度優先搜尋（BFS）探索狀態空間，證明存在合法解法且最優性已證明（`optimalityProven: true`）。
3. **目標解法步數區間驗證**：最短解法步數必須嚴格落在 $[MinSteps(L), MaxSteps(L)]$ 區間內。

任何一道門禁未通過或節點預算超限，生成器將自動遞增 Attempt 並重新生成，絕不發布未完成驗證之盤面。

### 4. 雙層無限 Fallback 備援配方

- **固定里程碑備援**：預置前期教學與重點關卡之完整已驗證盤面與最短解。
- **動態派生備援配方**：無限高關卡依難度 Tier、固定結構模板與確定性置亂配方動態生成保證可解盤面。
- **本地驗證快取**：首次動態驗證成功之盤面自動永久寫入快取，後續進入立即讀取。

---

## 模組架構說明

```text
Liquid-Cipher/
├── index.html                  # 現代語義化 HTML5 骨架、PWA 宣告與全息彈窗結構
├── manifest.webmanifest        # PWA Web App Manifest 配置
├── sw.js                       # PWA Service Worker 離線快取與版本更新腳本
├── README.md                   # 專案架構、設計系統與運行說明文檔
├── LICENSE                     # MIT 開源授權條款
├── logo/                       # PWA 應用圖標、Favicon 與 Apple Touch Icon 資產
├── src/
│   ├── main.js                 # 應用程式啟動進入點、PWA 生命週期與協調
│   ├── styles/
│   │   ├── main.css            # Cyber-Lab Dark Tech 設計系統變數、字型與全域排版
│   │   └── components.css      # HUD 遙測欄、按鈕群、PWA 更新橫幅與彈窗樣式
│   ├── core/
│   │   ├── constants.js        # 12 種化學試劑、管型、渲染參數與運算政策常數
│   │   ├── types.js            # JSDoc 型別定義
│   │   ├── hash.js             # 32-bit FNV-1a 字串雜湊函式
│   │   ├── prng.js             # Mulberry32 確定性偽隨機數生成器
│   │   ├── color.js            # 色彩空間轉換、對比度計算與色盲符號標記
│   │   ├── difficulty.js       # 純數學難度參數與步數區間計算
│   │   ├── solver.js           # Exact Solver 最短解證明與 Bounded 提示求解器
│   │   ├── generator.js        # 三重門禁關卡生成管線
│   │   ├── fallbackLevels.js   # 雙層無限 Fallback 備援資料庫與配方
│   │   └── gameState.js        # 遊戲狀態機、Water Sort 傾倒物理與存檔持久化
│   ├── workers/
│   │   └── solverWorker.js     # 背景非同步計算 Web Worker
│   ├── render/
│   │   ├── shapes.js           # 5 種玻璃容器向量 Path2D 外輪廓定義
│   │   ├── canvas.js           # High-DPI Retina 適配與自適應試管排版
│   │   ├── liquidRenderer.js   # 分層液體、半月板微波紋、試管底座與色標渲染
│   │   └── animationEngine.js  # 60fps 動畫循環、提示能量弧線、射流與粒子特效
│   ├── audio/
│   │   └── soundSynth.js       # Web Audio API 即時程序化音效合成器
│   └── ui/
│       └── uiController.js     # DOM 事件監聽、HUD 同步、高精度碼表與彈窗控制
└── test/
    ├── verify_prng.js          # PRNG 確定性與雜湊演算法測試
    ├── verify_difficulty.js    # 難度曲線非遞減特性測試 (L = 1 ~ 100)
    ├── verify_pipeline.js      # 求解器與三重門禁生成管線測試
    ├── verify_bugfixes.js      # Bug 修復回歸測試
    └── verify_pwa.js           # PWA 設定與 Service Worker 離線快取測試
```

---

## 驗證測試

專案內建完整的自動化測試套件，可透過 Bun 執行驗證：

```bash
# 執行全量測試套件
bun test/verify_prng.js
bun test/verify_difficulty.js
bun test/verify_pipeline.js
bun test/verify_bugfixes.js
bun test/verify_pwa.js
```

---

## 授權條款

本專案採用 [MIT License](./LICENSE) 授權開源。