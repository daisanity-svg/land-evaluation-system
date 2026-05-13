'use client';

import { useMemo, useState } from 'react';

const today = new Date().toISOString().slice(0, 10);
const GPT_URL = 'https://chatgpt.com/g/g-6a03e60a20948191b57eb98f7cbf4672-hai-yue-tu-di-ping-gu-diao-yan-zhu-shou';

const makeFileName = ({ client, landNumber, researchDate }) => {
  const safeClient = client || '土地評估';
  const safeLand = landNumber || '地號';
  const safeDate = researchDate || today;
  return `${safeClient}_${safeLand}_${safeDate}`.replace(/[\\/:*?"<>|]/g, '-');
};

const buildPrompt = ({ client, researchDate, landNumber }) => `幫我做土地評估，配合業主：${client || '＿＿建設'}，調研日期：${researchDate || '今天'}，目標地號：${landNumber || '＿＿地號'}。\n\n請依海悅土地評估格式，調查這筆土地並產出完整報告。請包含土地分區、建蔽率、容積率、基地面積、學區、里別、基地四向現況、交通動線、生活機能、公共建設、區域銷況、競案分析、建議產品、價格預判、綜合評估、資料來源與待複核事項。`;

const emptyForm = {
  client: '',
  researchDate: today,
  landNumber: '',
  reportText: '',
};

export default function Page() {
  const [form, setForm] = useState(emptyForm);
  const [copied, setCopied] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const hasReport = form.reportText.trim().length > 0;
  const canOpenGpt = useMemo(() => form.client.trim() && form.landNumber.trim(), [form.client, form.landNumber]);

  const printPdf = () => {
    document.title = makeFileName(form);
    window.print();
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(buildPrompt(form));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openGptWithPrompt = async () => {
    if (!canOpenGpt) {
      alert('請先填寫配合業主與目標地號。');
      return;
    }

    const prompt = buildPrompt(form);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // 若瀏覽器阻擋剪貼簿，仍然嘗試用網址帶入提示詞。
    }

    const urlWithPrompt = `${GPT_URL}?q=${encodeURIComponent(prompt)}`;
    window.open(urlWithPrompt, '_blank', 'noopener,noreferrer');
  };

  const copyReport = async () => {
    if (!hasReport) return;
    await navigator.clipboard.writeText(form.reportText);
    alert('已複製完整報告。');
  };

  const requestWord = () => {
    alert('Word 輸出僅限戴異軒本人使用。免費版目前請由戴異軒本人複製報告內容後自行貼入 Word 編修；後續若要一鍵 DOCX 需升級後端權限版。');
  };

  const reset = () => setForm(emptyForm);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-topbar">
          <div className="brand-lockup" aria-label="海悅廣告品牌識別">
            <div className="brand-mark">H</div>
            <div className="brand-copy">
              <div className="brand-copy-top">HIYES</div>
              <div className="brand-copy-bottom">海悅廣告｜土地評估系統</div>
            </div>
          </div>
          <div className="public-chip">Free Workflow • GPT + PDF</div>
        </div>

        <div className="eyebrow">Hiyes Advertising Land Intelligence</div>
        <div className="hero-content">
          <div>
            <h1 className="app-title">免費版土地評估報告系統</h1>
            <p className="app-subtitle">
              輸入基本資料後，點擊「自動調研」即可開啟海悅土地評估調研助手，並自動帶入提示詞。使用者只要在 GPT 頁面按送出，完成調研後再複製回本系統輸出 PDF。
            </p>
          </div>
          <div className="toolbar hero-actions">
            <button className="btn ghost" onClick={reset}>清空</button>
            <button className="btn primary" onClick={printPdf} disabled={!hasReport}>輸出 PDF</button>
          </div>
        </div>
        <div className="status-row">
          <span>輸入地號即可帶入 GPT</span>
          <span>GPT 自動調研</span>
          <span>不使用 API Key</span>
          <span>貼回報告即可套版</span>
          <span>公開使用者可輸出 PDF</span>
          <span>Word 僅限戴異軒</span>
        </div>
      </section>

      <section className="workflow-grid">
        <section className="panel input-panel">
          <div className="panel-header compact">
            <p className="eyebrow small">Step 1</p>
            <h2>輸入資料後進入 GPT 自動調研</h2>
            <p className="muted">填寫三個欄位後，按「自動調研」，系統會開啟海悅土地評估調研助手並帶入提示詞；使用者在 GPT 頁面按送出即可開始。</p>
          </div>

          <div className="panel-body simple-form">
            <label className="field">
              <span>配合業主</span>
              <input value={form.client} onChange={(e) => update('client', e.target.value)} placeholder="例如：弘峻建設" />
            </label>
            <label className="field">
              <span>調研日期</span>
              <input type="date" value={form.researchDate} onChange={(e) => update('researchDate', e.target.value)} />
            </label>
            <label className="field">
              <span>目標地號</span>
              <textarea rows={4} value={form.landNumber} onChange={(e) => update('landNumber', e.target.value)} placeholder="例如：桃園市中壢區中運段156、157、160地號" />
            </label>

            <div className="action-card">
              <div>
                <strong>操作流程</strong>
                <p>按自動調研 → 開啟 GPT 並帶入提示詞 → 在 GPT 按送出 → 複製結果 → 回到本頁貼上報告。</p>
              </div>
              <div className="toolbar">
                <button className="btn" onClick={copyPrompt}>{copied ? '提示詞已複製' : '複製提示詞'}</button>
                <button className="btn primary" onClick={openGptWithPrompt} disabled={!canOpenGpt}>自動調研</button>
              </div>
            </div>
          </div>
        </section>

        <section className="panel preview-panel">
          <div className="panel-header preview-header">
            <div>
              <p className="eyebrow small">Step 2</p>
              <h2>貼上完整報告並輸出 PDF</h2>
              <p className="muted">將 GPT 產出的完整土地評估報告貼入下方，系統會自動套用海悅版式。</p>
            </div>
            <div className="toolbar">
              <button className="btn" onClick={copyReport} disabled={!hasReport}>複製全文</button>
              <button className="btn primary" onClick={printPdf} disabled={!hasReport}>PDF</button>
              <button className="btn locked" onClick={requestWord}>Word</button>
            </div>
          </div>

          <div className="paste-area no-print">
            <label className="field">
              <span>貼上 GPT 產出的完整土地評估報告</span>
              <textarea rows={10} value={form.reportText} onChange={(e) => update('reportText', e.target.value)} placeholder="請把海悅土地評估調研助手產出的完整報告貼在這裡。" />
            </label>
          </div>

          <article className="report-paper">
            <div className="report-brand-row">
              <div className="report-brand-lockup">
                <div className="report-brand-mark">H</div>
                <div>
                  <div className="report-brand-title">HIYES</div>
                  <div className="report-brand-subtitle">海悅廣告｜土地評估系統</div>
                </div>
              </div>
              <div className="report-brand-side">
                <span>土地開發初評</span>
                <span>PDF OUTPUT</span>
              </div>
            </div>
            <pre className="text-report">{hasReport ? form.reportText : '尚未貼上土地評估報告。\n\n請先輸入配合業主、調研日期與目標地號，點擊「自動調研」。系統會開啟海悅土地評估調研助手並自動帶入提示詞。調研完成後，請複製 GPT 產出的完整報告並貼回本頁。'}</pre>
            <div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div>
          </article>
        </section>
      </section>

      <footer className="designer-credit" aria-label="設計人署名">
        <span>Designed by</span>
        <strong>海悅機構｜海宇國際 戴異軒 製</strong>
      </footer>
    </main>
  );
}
