# Phase 2A：Hermes 調研品質整合

狀態：已執行評估，但不通過正式輸出驗收。此階段沒有呼叫 `submitReport`、沒有寫入 Supabase、沒有修改 production，也沒有修改正式 01–12 報告契約。

## 驗收結論

Hermes 的 health、create、status、wait 可用，但長任務沒有穩定回傳可驗證的研究結果或 artifacts。沿用 session 的回收結果更出現其他專案的 artifact，代表工作階段隔離或結果對應關係不足以支撐正式土地調研。三次唯讀執行如下：

- `run_38929932aca141bf8f761160edfe9c26`：完成啟動盤點，未完成指定個案研究。
- `run_13a95e8c59834a59a968bb4d516ae7e9`：狀態完成，但 output 為空、artifacts 為空。
- `run_2d586b6928f24b80b3164e3bcc7efc74`：回收出與本案無關的其他專案 artifact。

因此，Hermes 目前只能保留為隔離的研究候選來源，不得直接餵入正式報告、Excel 或資料庫。最小解除條件是：run 與 artifact 可一對一追溯、session 不跨專案污染、每個欄位有來源與查證狀態、品質閘門通過。

## Excel 差異與根因

人工版和系統版的主要差異不是單純文字潤飾，而是證據層級不同：

| 項目 | 人工版 | 系統版 | Phase 2A 判定 |
| --- | --- | --- | --- |
| 基地總面積 | 1,806.78 平方公尺／546.55 坪 | 待複核 | 尚無逐筆官方面積，不形成確定量體 |
| 使用分區 | 第五種住宅區 | 中心商業區（初判） | 衝突，需正式分區證明或官方套繪 |
| 四向 | 北、西臨路；南、東臨地 | 多為區域性模糊描述 | 缺地籍套繪與現勘，不能自動採用 |
| 競案 | 四案且多數欄位完整 | 四案但建商、車位等多項待查 | 必須保留缺值，不得補猜 |
| 建議價格 | 住宅 45、店面 50、車位 200 | 住宅 48–52、店面 60–72、車位 220–250 | 樣本期間與排除規則未重算，不形成單一價格 |
| 區域圖 | OOXML 內含一張 PNG 與 drawing | 沒有 media/drawing | 現行 Excel 產生程式沒有插圖流程；圖源授權未確認前維持空白降級 |

兩版研究日期不同屬正常快照差異，不列缺陷。A34 顯示的 41／96 是 shared-string 索引，兩者都解析為空字串，也不列缺陷。

程式面的根因是研究結果只有自由文字，沒有逐欄來源、衝突、信心與人工複核狀態；Excel 端直接解析 `report_text`，自然無法區分「已證實」與「看似完整」。目前 `app/api/research/route.js` 仍是舊的自由文字研究端點，且 `sources` 固定回空陣列。正式流程也尚未接入 Hermes。

## 本分支新增的隔離契約

- `schemas/hermes-research-package.schema.json`：定義逐欄 raw/normalized value、單位、來源、日期、證據、信心、衝突與查證狀態。
- `fixtures/research/shanjie-188-189.phase2a.json`：去識別化安全 fixture；保留公開地號案例以測試正規化，競案與客戶名稱使用 fixture 名稱。
- `lib/researchQualityGate.mjs`：拒絕自動解決衝突、缺證據補值、道路計畫／現況混用、競案少於 3 或多於 5、未確認面積量體、未確認法規與價格，以及疑似憑證內容。
- `tests/research-quality-gate.mjs`：以通過 fixture 與破壞性變體測試上述規則。

上述內容沒有接上 production route、頁面、Builder、Excel 產生器或資料庫。

## Phase 2B 最小方案

1. 修正 Hermes run/session/artifact 的隔離與一對一追溯，並加入 artifact checksum、case ID、schema version。
2. 只在新研究端點產出結構化 package；先跑品質閘門，失敗時僅回傳人工複核清單。
3. 串接正式地籍面積、分區圖證、道路／建築線、里界學區與實價登錄來源；每個結論保留來源日期與擷取時間。
4. 競案採 3–5 案、可解釋選案理由與成交排除規則；缺建商或車位就保留 `null`。
5. 區域圖只接受授權清楚、具 attribution 的來源；無圖時維持固定版面空白降級。
6. 在隔離環境做 end-to-end fixture 驗收後，才另案討論是否接 Builder、Excel 與 `submitReport`；Phase 2B 仍不得直接寫 production。
