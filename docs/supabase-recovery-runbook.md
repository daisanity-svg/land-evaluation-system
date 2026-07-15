# Supabase `reports` 備份、migration 與復原手冊

本手冊適用於土地評估系統的 `public.reports`。目標是保留現有報告、讓 schema 可重建，並在每次資料庫異動前後留下可驗證證據。

## 安全原則

- 不在 GitHub、PR、issue、log 或聊天訊息保存資料庫密碼、service role key、連線字串或報告備份。
- 不把 `schema.sql`、`data.sql`、CSV 或 Dashboard 下載的備份 commit 到 repository。
- 正式專案禁止執行 `supabase db reset --linked`；這個命令會重建遠端資料庫中的使用者物件。
- migration 遇到空白／重複 `report_id` 或不相容欄位型別時會整筆 transaction 回滾，不會自行刪除、去重或轉換報告內容。
- RLS 與 API 授權屬另一個安全階段；本 migration 不改現有 RLS／policy，避免尚未驗證就中斷正式流程。

## 本次版本化內容

- `supabase/migrations/20260715050000_reports_schema_baseline.sql`
- `supabase/verification/reports_preflight.sql`
- `supabase/verification/reports_postflight.sql`

正式程式需要以下欄位：

| 欄位 | 基準型別 | 用途 |
|---|---|---|
| `report_id` | `text`，唯一且不可為空 | upsert 與查詢識別 |
| `client` | `text` | 客戶名稱 |
| `land_number` | `text` | 地號 |
| `research_date` | `text`（既有 `date` 亦相容） | 調查日期 |
| `summary` | `jsonb` | 八欄摘要 |
| `report_text` | `text` | 01～12 章完整報告 |
| `created_at` | `timestamptz` | 建立時間 |
| `updated_at` | `timestamptz` | 最後更新時間 |

## 第 1 步：確認 Supabase 已恢復

先確認 Dashboard 顯示專案正常，再檢查：

```text
GET https://land-evaluation-system.vercel.app/api/health-supabase
```

只在回應顯示 `supabase.configured: true`、`supabase.ok: true` 時繼續。

## 第 2 步：建立免費的私有邏輯備份

Supabase CLI 的 `db dump` 可分別匯出 schema 與 data。需要從 Dashboard 的 **Connect** 取得資料庫連線字串及密碼；不要使用 service role key 代替資料庫密碼。

在不屬於 Git repository 的私有資料夾執行：

```bash
read -rsp "貼上 SUPABASE_DB_URL（畫面不會顯示）: " SUPABASE_DB_URL
echo
export SUPABASE_DB_URL
BACKUP_DIR="$HOME/land-evaluation-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"
supabase db dump --db-url "$SUPABASE_DB_URL" --schema public -f schema.sql
supabase db dump --db-url "$SUPABASE_DB_URL" --schema public --data-only --use-copy -f data.sql
```

如果尚未安裝 CLI，可先在 Dashboard 的 **Database > Backups** 檢查平台備份；若方案不提供可下載備份，先安裝 Supabase CLI 再執行上述邏輯備份。備份完成後確認兩個檔案皆非空，並存放在只有本人可讀取的位置。

> 不要採用官方範例中把資料備份自動 commit 回 repository 的方式；這個 repository 是公開專案，報告內容不得進入 Git 歷史。

## 第 3 步：唯讀 preflight

在 Supabase SQL Editor 開啟並執行 `supabase/verification/reports_preflight.sql`。檢查：

- SQL Editor 只會顯示一個結果表，欄位為 `check_name`、`actual`、`expected`、`passed`。
- 除 `total_reports` 與 `rls_forced` 是資訊列外，所有 `passed` 都必須是 `true`。
- 將 `total_reports` 記入變更紀錄，但不要公開客戶或報告資料。
- 此查詢只回傳統計與結構檢查，不回傳客戶、地號、report_id、summary 或 report_text。

若任何檢查的 `passed` 為 `false`，停止套用並人工確認；不得自動刪除、轉換或修補既有報告。

## 第 4 步：套用 migration

第一次建立版本基準時，建議先在 SQL Editor 完整貼上並執行 migration。確認檔名與即將執行的 commit 一致：

```text
supabase/migrations/20260715050000_reports_schema_baseline.sql
```

未來資料庫已由 Supabase CLI 管理後，改用：

```bash
supabase link --project-ref <project-ref>
supabase db push --dry-run
supabase db push
```

`--dry-run` 只能確認待套用清單，不能取代備份與 preflight。不要在正式專案使用 `db reset`。

## 第 5 步：postflight 與應用驗收

1. 在 SQL Editor 執行 `supabase/verification/reports_postflight.sql`。
2. 必要欄位應為 8 欄，duplicate 查詢應回傳 0 rows。
3. 應存在 `reports_set_updated_at` trigger 與 `reports_created_at_idx`。
4. postflight 的 `total_reports` 應等於 preflight；migration 不應改變報告筆數。
5. 依序驗證 production：
   - `/api/health-supabase` 正常。
   - `/api/openapi` 可讀，`operationId` 仍為 `submitReport`。
   - 使用全新的測試 `report_id` submit，應回 HTTP 201、`verified: true`、`operation: created`。
   - 相同內容重送，應回 HTTP 200、`operation: existing_verified`。
   - 更新同一測試 `report_id`，應回 HTTP 200、`operation: updated`。
   - `/api/reports/{report_id}/status` 不得含完整 `report_text`。
   - 報告頁與 Excel 下載正常。

## 失敗與復原

- migration 本身在 transaction 內；若 SQL Editor 顯示錯誤，變更會回滾。先保存錯誤訊息與 `request_id`（若有），不要反覆重跑。
- 若 migration 成功但 API 異常，先執行 postflight，確認 schema、唯一索引與 trigger。不要刪表或刪除報告。
- 若確認資料遭到非預期改動，停止 submitReport 流量並使用套用前的私有 logical backup，在新的隔離 Supabase project 或本機環境演練還原；核對筆數與抽樣資料後，再決定正式復原窗口。
- Dashboard 整體 backup restore 會造成服務暫停，必須選定維護時段後才執行。

## 官方參考

- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI：db dump／db push](https://supabase.com/docs/reference/cli/introduction)
- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [PostgREST Schema Cache Reloading](https://docs.postgrest.org/en/latest/references/schema_cache.html)
