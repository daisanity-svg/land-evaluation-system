# 土地評估系統｜Excel 簡表下載功能規格

## 開發原則

本功能為既有土地評估系統的獨立輸出支線，只新增 Excel 簡表下載功能，不修改既有：

- submitReport / submitHiyesReport 回傳流程
- report_text 儲存流程
- summary JSON 欄位 mapping
- PDF 輸出流程
- 既有報告渲染邏輯

## 固定資料母體

Excel 簡表不得要求調研助手額外產出 excel_payload。資料來源固定使用已儲存的正式業主版 report_text。

固定流程：

1. 系統透過 report_id 讀取 reports 資料表中的 report_text。
2. 解析 report_text 的固定段落與關鍵字。
3. 將資料填入固定 Excel 模板。
4. 輸出 .xlsx 檔案供使用者下載。

## 固定模板

模板來源為使用者確認過的「格式模板請固定好欄寬及列高.xlsx」。

系統內建模板以 Base64 文字保存於：

```text
templates/land-evaluation-template.xlsx.base64
```

實作 Excel 匯出時，需將 Base64 decode 成 Buffer 後交給 Excel 套件讀取。不得從零建立空白活頁簿，避免欄寬、列高、合併儲存格與版型跑掉。

## 模板保護規則

匯出時只能填資料，不可改動：

- 欄寬
- 列高
- 合併儲存格
- 框線
- 字型大小與比例
- 列印範圍
- A4 列印設定
- 底部區域圖預留空間

## 合併儲存格寫入規則

遇到合併儲存格時，必須寫入該合併區塊的左上角主儲存格。

錯誤情境：寫入合併區塊的中間格、右側格或下方格，Excel 畫面會看似沒有帶入資料。

## report_text 解析段落

固定解析以下段落：

- 01｜案件摘要
- 04｜臨路條件與基地四向現況
- 05｜生活圈與市場定位
- 06｜學區與里別
- 08｜競案分級與市場行情
- 09｜價格預判
- 10｜產品規劃建議
- 11｜銷售優勢與抗性

### 01｜案件摘要

抓取：

- 配合業主
- 調研日期
- 目標地號
- 基地位置
- 土地使用分區
- 基地面積
- 建蔽率
- 容積率
- 臨路條件
- 建議價格
- 建議產品

### 04｜臨路條件與基地四向現況

抓取：

- 東向
- 南向
- 西向
- 北向

若段落為表格格式「方位｜現況｜對銷售影響」，應優先抓取現況欄內容，必要時可補入對銷售影響的簡短摘要。

### 05｜生活圈與市場定位

抓取：

- 交通通勤
- 生活機能
- 區域條件
- 市場定位

### 06｜學區與里別

抓取：

- 里別
- 基礎教育學區
- 中等教育學區

### 08｜競案分級與市場行情

每個競案獨立解析，欄位需精簡：

- 案名
- 狀態／屋齡
- 房型
- 坪數
- 成交價格
- 車位價格
- 資訊來源
- 備註

競案填寫規則：

- 房型寫「2-3房」「2-4房」或「一房到三房」。
- 坪數寫最小到最大，例如「28-49坪」。
- 不寫「大型社區住宅」「部分店面」「套房」等冗字。
- 若有套房，併入房型，例如「1-3房」。
- 找不到明確房型或坪數時，填「待複核」，不可亂編。

### 09｜價格預判

固定抓取：

- 二樓以上住宅
- 店面
- 坡道平面車位

價格欄位只填數字區間，不覆蓋模板原本單位。

範例：

- 二樓以上住宅：48～52萬／坪 → 填入 `48～52`
- 店面：60～70萬／坪 → 填入 `60～70`
- 坡道平面車位：180～220萬／位 → 填入 `180～220`

### 10｜產品規劃建議

抓取：

- 兩房產品建議坪數
- 三房產品建議坪數
- 兩房總價控制
- 三房總價控制
- 不建議產品摘要

### 11｜銷售優勢與抗性

抓取：

- 銷售優勢最多三點
- 銷售抗性／劣勢最多三點

若 report_text 內容品質不足，可少於三點，不可硬塞錯誤內容，也不可把優勢填進劣勢欄或把劣勢填進優勢欄。

## 建議 API

新增獨立 API，不影響既有 report API：

```text
GET /api/reports/[reportId]/excel
```

功能：

1. 用 reportId 到 Supabase `reports` 表查詢該案件。
2. 讀取 `report_text`。
3. 解析 report_text。
4. 讀取並 decode `templates/land-evaluation-template.xlsx.base64`。
5. 使用 Excel 套件打開模板。
6. 填入指定儲存格。
7. 回傳 xlsx 檔案。

Response header 建議：

```text
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="<client>-<land_number>-土地評估簡表.xlsx"
```

## UI 建議

在報告已回傳且 report_text 存在時，新增按鈕：

```text
下載 Excel 簡表
```

按鈕行為：

```js
window.location.href = `/api/reports/${encodeURIComponent(reportId)}/excel`;
```

## 驗收標準

1. 不影響原本 report_text 回傳、summary JSON 與 PDF。
2. 下載的 xlsx 可以用 Microsoft Excel for Mac 正常開啟，不出現修復警告。
3. 欄寬與列高與固定模板一致。
4. 價格預判有帶入，且單位沒有被覆蓋。
5. 綜合評估優勢／劣勢有正確帶入。
6. 個案參考房型與坪數格式精簡。
7. 區域圖預留區保持空白。
