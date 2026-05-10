# 海悅廣告｜土地評估系統

這是一套土地評估 MVP，可用於：

- 匯入 ChatGPT 產出的土地評估 JSON
- 將 JSON 轉成可編輯表單
- 手動修改每一個報告欄位
- 即時預覽「海悅廣告　土地評估分析表」
- 匯出修改後 JSON
- 使用瀏覽器列印功能輸出 PDF
- 透過 GitHub Pages 部署成公開網頁

## 線上部署

本 repo 已加入 GitHub Pages workflow：

`.github/workflows/deploy-pages.yml`

部署步驟：

1. 到 GitHub repo 的 `Settings`。
2. 點左側 `Pages`。
3. Source 選 `GitHub Actions`。
4. 回到 `Actions`，等待 `Deploy static app to GitHub Pages` 跑完。
5. 完成後網址為：

```text
https://daisanity-svg.github.io/land-evaluation-system/
```

## 本機啟動

```bash
npm install
npm run dev
```

開啟：

```text
http://localhost:3000
```

## 使用方式

### 1. 匯入 JSON

將 ChatGPT 產出的土地評估 JSON 貼到「JSON 匯入」欄位，按「匯入 JSON」。

### 2. 手動修改欄位

左側表單可修改：

- 基本資料
- 法定量體
- 基地四向現況
- 交通動線
- 生活機能
- 公共建設
- 學區與里別
- 競案分析
- 價格預判
- 建議產品
- 綜合評估

### 3. 預覽報告

右側即時顯示一頁式「海悅廣告　土地評估分析表」。

### 4. 輸出 PDF

按右上角「列印 / PDF」，或使用：

```text
Command + P
```

列印目的地選「儲存為 PDF」。

## 主要檔案

```text
.github/workflows/deploy-pages.yml
app/layout.jsx
app/page.jsx
app/globals.css
components/JsonForm.jsx
components/ReportPreview.jsx
lib/defaultData.js
next.config.js
package.json
run_web_app.sh
sample_input.json
```

## 注意事項

- 空值或不確定資料預設保留「待複核」。
- PDF 檔名可在儲存時依規則手動命名：建設公司名＋地段地號＋調研日期。
- GitHub Pages 首次部署需先到 Settings → Pages 選 GitHub Actions。
