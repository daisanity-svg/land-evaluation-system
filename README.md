# 土地評估 Codex 專案規格包

這份資料包是給 Codex 使用的完整開發規格，目標是建立「海悅廣告｜土地評估系統」。

## 建議給 Codex 的使用方式

請將整包資料放入專案根目錄，然後對 Codex 下指令：

```text
請先閱讀本資料夾所有檔案，尤其是 00_Codex_Master_Prompt.md。
請依照規格建立一套土地評估系統。
MVP 必須完成：JSON 匯入、表單編輯、報告預覽、JSON 匯出、PDF 輸出。
```

## 檔案說明

- `00_Codex_Master_Prompt.md`：給 Codex 的總任務提示詞
- `01_Product_Requirement_Document.md`：產品需求文件
- `02_Data_Model_JSON_Schema.json`：核心 JSON Schema
- `03_Report_Template_Fields.json`：報告欄位與版型順序
- `04_Research_Logic.md`：土地評估調研邏輯
- `05_UI_UX_Spec.md`：介面與操作流程規格
- `06_PDF_Export_Rules.md`：PDF 輸出與檔名規則
- `07_Test_Cases.json`：測試案例
- `08_Acceptance_Checklist.md`：驗收清單
- `sample_input.json`：測試匯入用 JSON
- `sample_output.json`：預期輸出用 JSON

## MVP 核心

1. 使用者貼上 JSON
2. 系統解析成可編輯表單
3. 使用者可修改每一欄
4. 系統即時產生一頁式土地評估報告
5. 可輸出 PDF
6. 可下載修改後 JSON
