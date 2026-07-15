# 土地評估系統穩定基準（2026-07-15）

## 基準版本

- Repository：`daisanity-svg/land-evaluation-system`
- Production branch：`main`
- Baseline commit：`1ea6a4a91b60211ac479950239fed153b839d02e`
- Production：Vercel
- Persistence：Supabase `public.reports`

本文件只記錄架構、契約與復原基準，不包含任何報告內容、API key、Authorization header 或其他密鑰。

## 正式流程

1. 使用者在土地評估網頁輸入 `client`、`research_date` 與 `land_number`。
2. 網頁建立 `report_id`，開啟土地評估 Custom GPT。
3. Custom GPT 產生 01～12 章 `report_text` 與八欄 `summary`。
4. GPT Action 呼叫 `POST /api/reports`（`operationId: submitReport`）。
5. API 以 `report_id` upsert 至 Supabase，並 read-after-write verification。
6. 網頁依 `report_id` 載入報告，提供業主閱讀版、PDF 與 Excel 簡表。

## 不可破壞契約

- `submitReport` 必須保留：`report_id`、`client`、`land_number`、`research_date`、`summary`、`report_text`。
- `report_text` 必須維持 01～12 章正式業主版。
- `summary` 必須維持：`location`、`land_number`、`zoning`、`area`、`road`、`price`、`product`、`conclusion`。
- 新建成功回 HTTP 201；更新或相同內容驗證成功回 HTTP 200。
- 只有 read-after-write 完整比對成功才可回 `verified: true`。
- 一般公開使用流程不要求登入。
- 不得在 response 或 log 洩漏任何 service role key、Authorization header 或完整環境變數。

## 正式環境變數名稱

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`OPENAI_API_KEY` 與 `OPENAI_MODEL` 只供未納入正式主流程的 `/api/research` 使用，不是 Custom GPT 回傳流程的必要條件。

## 發布門檻

所有變更必須在獨立 branch 完成，並通過：

```bash
npm ci
npm test
npm run build
```

PR Preview 驗收完成前不得合併 `main`。正式部署後還需驗證健康檢查、OpenAPI、submitReport 新建／重送／更新、報告載入、PDF 與 Excel。

## 已知後續工作

- 升級具有安全修補的相容 Next.js 版本。
- 將 Supabase `reports` schema 保存為可重複執行的 migration。
- 修正 Supabase 健康檢查的 HTTP status 與公開診斷資訊。
- 收斂 GitHub Pages 與 Vercel 的部署責任。
- 分階段保護 submitReport、完整報告與 Excel endpoint。
- 更新 README，使文件與正式架構一致。
