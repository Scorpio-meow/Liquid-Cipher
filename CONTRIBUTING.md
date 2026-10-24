# 貢獻指南

感謝你願意花時間改進液體解鎖 (Liquid Cipher)！本文件說明回報問題、提出建議與提交程式碼的流程。

參與本專案即表示你同意遵守[行為準則](./CODE_OF_CONDUCT.md)。

## 目錄

- [回報問題](#回報問題)
- [提出功能建議](#提出功能建議)
- [開發環境](#開發環境)
- [提交 Pull Request](#提交-pull-request)
- [Commit 訊息規範](#commit-訊息規範)
- [程式碼風格](#程式碼風格)
- [測試](#測試)
- [無障礙](#無障礙)
- [授權](#授權)

## 回報問題

- 回報前請先搜尋[現有 Issue](https://github.com/Scorpio-meow/Liquid-Cipher/issues)，避免重複。
- 請使用對應的 Issue 範本：**錯誤回報**、**功能建議**或**無障礙問題回報**，並盡量填寫重現步驟與執行環境。
- 安全性漏洞請**不要**公開回報，請依照[安全性政策](./SECURITY.md)私下回報。

## 提出功能建議

- 請先說明想解決的問題與使用情境，再提出你建議的做法。
- 較大的改動請先開 Issue 討論，確認方向後再動手，避免白費功夫。

## 開發環境

本專案使用原生 ES Modules，零建置、沒有 npm 相依套件。開發時需要：

- 支援 ES Modules、Web Worker 與 `<dialog>` 的現代瀏覽器
- [Bun](https://bun.sh)：用來啟動本機伺服器與執行驗證腳本

```bash
git clone https://github.com/<你的帳號>/Liquid-Cipher.git
cd Liquid-Cipher
bunx serve .
```

接著在瀏覽器開啟終端機顯示的網址即可。

> [!TIP]
> 本專案使用 Service Worker 快取資源。開發時如果修改沒有生效，請在瀏覽器開發者工具的 **Application → Service Workers** 勾選「Update on reload」，或改用無痕視窗測試。

## 提交 Pull Request

1. Fork 本專案，並從 `main` 建立新分支，建議命名為 `feat/簡短描述`、`fix/簡短描述` 或 `docs/簡短描述`。
2. 完成修改後，依照下方[測試](#測試)章節自行驗證。
3. 依照[Commit 訊息規範](#commit-訊息規範)撰寫 commit 訊息。
4. 推送分支並建立 Pull Request，完整填寫 PR 範本中的檢查清單。
5. 一個 PR 只處理一件事；不相關的修改請拆成多個 PR，方便審查。

維護者審查時可能會請你調整內容，這是正常的協作過程，感謝你的耐心。

## Commit 訊息規範

本專案採用 [Conventional Commits](https://www.conventionalcommits.org/zh-hant/v1.0.0/) 格式：

```text
<type>(<scope>): <描述>
```

| type | 用途 |
| :--- | :--- |
| `feat` | 新增功能 |
| `fix` | 修正錯誤 |
| `docs` | 只修改文件 |
| `style` | 不影響邏輯的格式調整 |
| `refactor` | 不改變行為的重構 |
| `perf` | 效能改善 |
| `test` | 新增或修改測試 |
| `chore` | 其他雜項（例如設定檔） |

`<scope>` 可省略，描述請用中文或英文簡潔說明「做了什麼」，例如：

```text
feat(solver): 提示功能改為顯示剩餘最少步數
```

## 程式碼風格

- 遵循既有的模組分層：`src/core/` 是不碰 DOM 的純邏輯，畫面繪製放在 `src/render/`，介面互動放在 `src/ui/`。
- 不引入框架、打包工具或 npm 套件。
- 關卡生成必須維持確定性：同一個關卡序號在任何裝置上都要產生相同的盤面。
- 新增或更名 `src/` 下的檔案時，請同步更新 `sw.js` 的 `PRECACHE_ASSETS` 清單（`test/verify_pwa.js` 會檢查）。
- 修改會被快取的資源時，請遞增 `sw.js` 中的 `CACHE_NAME` 版本號，讓已安裝的玩家能收到新版本提示。
- 沿用既有檔案的縮排、命名與匯出方式。

## 測試

送出 PR 前請執行全部驗證腳本，並確認都通過：

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

如果修改了遊戲規則、難度曲線或關卡生成，請一併新增或更新對應的驗證腳本。涉及畫面的改動，請在桌機與手機尺寸下實際遊玩確認。

## 無障礙

新功能請一併考量[無障礙聲明](./ACCESSIBILITY.md)中的承諾，例如新的互動要能只用鍵盤完成、重要的狀態變化要讓螢幕閱讀器知道、資訊不能只靠顏色傳達、動畫要尊重 `prefers-reduced-motion`。

## 授權

提交貢獻即表示你同意你的貢獻以本專案的 [MIT License](./LICENSE) 授權釋出。
