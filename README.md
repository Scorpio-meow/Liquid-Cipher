# Liquid Cipher

Liquid Cipher 是一款以 HTML5 Canvas 製作的單頁色彩解密小遊戲。玩家需要依照 RYB 減法混色規則，透過倒液與分類完成三個關卡。

## 線上展示

- [立即遊玩](https://scorpio-meow.github.io/Liquid-Cipher/)

## 特色

- 3 個循序漸進的關卡
- 以 RYB（紅／黃／藍）混色規則為核心的試管玩法
- Canvas 動畫與互動式操作
- Undo、重置與音效切換功能
- 內建實驗調色台，可即時預覽混色結果
- 通關彈窗與霓虹風格介面

## 如何執行

這個專案是單一靜態頁面，直接開啟 `index.html` 即可。

### 方式 1：直接開啟

1. 在檔案總管、瀏覽器或 VS Code 中開啟 `index.html`
2. 開始遊玩

### 方式 2：使用本機伺服器

如果你希望用本機 HTTP 服務執行，或瀏覽器對音效/資源載入有額外限制，可以用以下方式：

```bash
python3 -m http.server 8000
```

然後前往：

```text
http://localhost:8000
```

## 操作方式

- 點選一支試管作為來源
- 再點選另一支有空位的試管倒入液體
- 盡可能把相同顏色集中到同一支試管
- 使用 Undo、重置與音效開關輔助操作

## 技術組成

- HTML5
- JavaScript
- HTML5 Canvas
- Web Audio API
- Tailwind CSS CDN
- Google Fonts

## 專案結構

- `index.html`：遊戲主頁、樣式與互動邏輯都集中在這個檔案

## 備註

- 這個頁面依賴外部 CDN 載入 Tailwind CSS 與字型資源，請保持網路連線以獲得完整效果。
- 音效可能會因瀏覽器自動播放政策而需要先進行一次使用者互動才會啟用。