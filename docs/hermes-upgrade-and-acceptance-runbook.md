# Hermes 受控升級與驗收手冊

目的：把 Hermes 作為土地評估的研究執行節點。它不得自行認定資料正確、不得寫入正式系統；所有可採用資料均須通過本專案的 gate 與人工／Codex 複核。

## 0. 變更窗口與停止條件

- 僅在 Hermes MCP 可使用、且使用者核准的維護窗口進行。
- 不以重試或替代帳號規避用量限制。
- 升級前未完成快照、健康檢查失敗、或無法回退時，停止。
- macOS 不採用桌面應用程式的一鍵更新；採可記錄版本的 CLI 更新並立即驗收。

## 1. 升級前快照（唯讀）

由 Hermes 主機管理者執行並保存輸出，不得含 API token、cookie 或個資：

```bash
hermes --version
hermes doctor
git --version
node --version
npm --version
python3 --version
```

另記錄：已安裝的 leaf skills（實際含 `SKILL.md` 的目錄）、技能來源路徑與雜湊、MCP 工具清單、adapter 版本、`/health` 結果、以及最近一次 fresh-session smoke test 的 run ID。設定檔與 skill 目錄建立具時間戳的離線備份；不得把機密提交到 Git。

## 2. 受控升級

目前目標版本為 Hermes Agent `v0.18.2`。依官方方式於維護窗口更新：

```bash
hermes update
# 若此安裝方式不支援 updater，依官方安裝方式使用：
pip install -U hermes-agent
```

更新後重啟所需服務，再執行 `hermes --version` 與 `hermes doctor`。如 gateway 未恢復健康、MCP 無法建立新工作，立即停止，還原升級前版本／設定並保留診斷輸出。不得在故障狀態下繼續執行土地研究。

## 3. 必過驗收

每項都必須記錄結果；任一失敗即不准進正式工作流。

| 驗收項目 | 通過定義 |
| --- | --- |
| 健康與版本 | health 正常，版本與升級目標一致 |
| MCP 連線 | 可建立新 run、取得該 run 的狀態與最終文字結果 |
| Session 隔離 | 兩個不同 case ID 的 fresh session，彼此輸出不含對方案件名稱、路徑或內容 |
| 嚴格 JSON | 使用 `taiwan-land-evidence` 最小測資，輸出可被 JSON parser 與 `researchQualityGate` 接受 |
| 負向測試 | 對沒有官方證據的欄位輸出 `null` + `needs_manual_review`，不得臆測填值 |
| 權限界線 | 任務 audit 顯示 `submitReport_called`、`supabase_written`、`production_modified`、`main_modified` 皆為 false |
| 追溯能力 | 若 artifact API 無法列出檔案，標示為失敗／未知；不可據此宣告 artifact 已保存 |

完成後由 Codex 執行：

```bash
npm test
npm run build
```

## 4. Skills 安裝原則

先修復失效的 `real-time-requirements` front matter，再以受版本控制的本專案 skill 原稿安裝 `taiwan-land-evidence`。只有在盤點確認缺少時，才增加官方 `ocr-and-documents` skill。

暫不安裝完整 GIS、`xlrd`、或第三方房仲／行銷技能。批量實價分析確有需求時，才評估加裝 `pandas`；安裝前需鎖定版本並重跑驗收。

## 5. 回退與交接

任何驗收失敗：停在研究沙盒、還原升級前快照、提交診斷，不重送任務。成功後才啟用本專案的研究契約；Hermes 只交付候選證據包，Codex 負責 gate、測試、程式變更與最終採用決定。
