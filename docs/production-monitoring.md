# 正式站唯讀監控

## 目的

`.github/workflows/production-monitor.yml` 每 6 小時執行一次免費的 GitHub Actions 監控，也可以在 Actions 頁面手動執行。監控只發出 `GET` 請求，不會建立、更新或刪除報告。

## 檢查內容

- 正式站首頁可回應 HTML。
- `/api/health` 回報應用程式健康。
- `/api/health-supabase` 確認正式環境已設定 Supabase，且唯讀查詢成功。
- `/api/openapi` 保留 `submitReport`、必要欄位、成功驗證欄位及正式 HTTP responses。
- `/api/reports/hy-1783998431127-iairjp/status` 確認已知報告、報告本文與摘要仍可讀取，但公開回應不得包含完整 `report_text`。

監控不會呼叫 `POST /api/reports`，也不會傳送 Authorization header、Supabase key 或其他密鑰。

## 告警與恢復

失敗時，workflow 會建立或更新一個標題為 `[monitor] Production smoke check failed` 的 GitHub Issue，並保留失敗狀態。後續檢查恢復正常時，workflow 會留言並關閉該 Issue，避免每次執行產生重複告警。

Issue 只包含檢查時間與 Actions 執行連結；不會放入 API response body、完整報告或敏感環境變數。

## 手動驗收

可在 GitHub 的 **Actions → Monitor production → Run workflow** 執行。也可在本機執行：

```bash
node scripts/production-smoke-check.mjs
```

GitHub 排程可能因平台負載而延後，因此這項監控用於定期發現故障，並非即時可用性保證。
