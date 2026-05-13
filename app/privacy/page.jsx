export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px', lineHeight: 1.8, color: '#153447' }}>
      <h1>海悅廣告｜土地評估系統 Privacy Policy</h1>
      <p>本系統用於土地評估報告產製與報告格式化。使用者輸入或由 GPT Action 回傳的資料，可能包含配合業主、調研日期、標的地號與土地評估報告文字。</p>
      <h2>資料用途</h2>
      <p>資料僅用於暫存土地評估報告、產生圖卡版報告、輸出 PDF 與後續查詢同一份報告。</p>
      <h2>資料儲存</h2>
      <p>GPT Action 回傳的報告會暫存在系統資料庫中，供使用者於本系統依 report_id 讀取並生成報告。</p>
      <h2>資料分享</h2>
      <p>本系統不會主動販售或分享使用者輸入內容。請勿輸入不應上傳至第三方服務的機密資料。</p>
      <h2>聯絡與移除</h2>
      <p>如需移除特定 report_id 的暫存內容，請洽系統管理者：海悅機構｜海宇國際 戴異軒。</p>
      <p style={{ marginTop: 32, fontSize: 13, color: '#648094' }}>Last updated: 2026-05-13</p>
    </main>
  );
}
