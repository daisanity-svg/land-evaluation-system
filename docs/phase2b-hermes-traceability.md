# Phase 2B：Hermes 可追溯性前置驗證

狀態：部分通過，artifact 回收仍阻塞。此工作只存在隔離分支，未接入 production route、Builder、Excel、Supabase 或 `submitReport`。

## 真實隔離 probe

Probe case：`phase2b-trace-20260718-01`

Run：`run_0f2cca4cd5744f07856f2270411f39b1`

| 驗收項目 | 結果 |
| --- | --- |
| fresh session | 通過，`session_id` 等於 `run_id` |
| terminal state | 通過，`completed`／`run.completed` |
| exact case marker | 通過 |
| output JSON | 通過，為單一可解析 JSON object |
| artifact SHA-256 | 通過，與無換行 marker 的 SHA-256 一致 |
| artifact listing | 失敗，`get_hermes_artifacts` 回傳空陣列 |
| production side effects | 無 |

這表示 fresh-session 小任務可以避免上一階段的跨專案內容污染，但模型聲稱已建立檔案不等於 adapter 已註冊、可列出或可驗證 artifact。正式研究流程必須以 artifact API 實際回收結果為準，不能只相信 output 中的路徑、檔名或雜湊。

## 本分支新增的驗收契約

- `schemas/hermes-trace-envelope.schema.json`：固定 case marker、fresh session、terminal event、單一 artifact、run 對應與 audit 邊界。
- `lib/hermesTraceGate.mjs`：驗證 output JSON、run/session、artifact filename、marker、SHA-256、run ownership 與憑證掃描。
- `fixtures/hermes/phase2b-trace-envelope.valid.json`：完全合格的去識別化合成 fixture。
- `fixtures/hermes/phase2b-probe-observation.failed.json`：本次真實 probe 的安全失敗樣本。
- `tests/hermes-trace-gate.mjs`：覆蓋 shared session、空 output、跨案件內容、空或多個 artifacts、錯誤 run、檔名、雜湊、side effect 與疑似憑證。

## 解除阻塞條件

1. artifact 寫入後必須由 adapter 建立 run-scoped registry record。
2. `get_hermes_artifacts(run_id)` 必須只列出該 run 的 artifacts，且至少提供 filename、run_id、SHA-256 與可驗證內容。
3. session continuation 不得成為預設；土地個案研究一律 fresh session，除非明確提供同一 case ID。
4. output 與 artifact 必須帶相同 case ID、marker、filename 與 SHA-256。
5. 修復後以同一測試重新執行，真實 observation 必須同時通過 JSON Schema 與 trace gate，才可開始正式資料源串接。

## Adapter 唯讀診斷

Hermes fresh run `run_c3724f7e7c064dd0aa2a8a2f9554b299` 檢查了本機 adapter：

`/Users/aiuser/AI-Workspace/hermes-mcp-adapter-ts`

檢查範圍包含 `src/serve.ts`、`src/server.ts`、`src/index.ts` 與 `scripts/repro.mjs`。目前 adapter 沒有 artifact 寫入路徑或 run-scoped registry；`get_hermes_artifacts` 僅轉送上游 `/v1/runs/{run_id}/artifacts`。既有 repro 只檢查 health 與 tool list，也沒有涵蓋 create → wait → artifacts 完整生命週期。

這次唯讀檢查無法看到真正擁有 artifact 的上游 API 實作，因此目前只能確認「adapter 沒有註冊能力、上游實際回空」，不能在缺少 artifact bytes 與上游契約時只靠修改 `serve.ts` 或解析模型 output 假造成功紀錄。

安全的最小修復需先取得 adapter 與上游 artifact API 的實際程式碼／契約，之後在獨立分支完成：

1. 建立真正接收 artifact bytes、計算 SHA-256 並綁定 `run_id` 的註冊動作。
2. artifact list 只讀同一 canonical registry，不從模型 output 推測檔案存在。
3. `scripts/repro.mjs` 增加 create → wait → register → list → content/hash verify，以及跨 run 不可見的負向測試。
4. 真實 probe 通過前，不啟用任何土地調研整合。
