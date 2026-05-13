'use client';

import { useState } from 'react';

const today = new Date().toISOString().slice(0, 10);
const GPT_URL = 'https://chatgpt.com/g/g-6a03e60a20948191b57eb98f7cbf4672-hai-yue-tu-di-ping-gu-diao-yan-zhu-shou';

const makeFileName = ({ client, landNumber, researchDate }) => {
  const safeClient = client || '土地評估';
  const safeLand = landNumber || '地號';
  const safeDate = researchDate || today;
  return `${safeClient}_${safeLand}_${safeDate}`.replace(/[\\/:*?"<>|]/g, '-');
};

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

  const printPdf = () => {
    document.title = makeFileName(form);
    window.print();
  };

  const copyPrompt = async () => {
    const prompt = `幫我做土地評估，配合業主：${form.client || '＿＿建設'}，調研日期：${form.researchDate || '今天'}，目標地號：${form.landNumber || '＿＿地號'}。請依海悅土地評估格式完成完整報告。`;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              先使用「海悅土地評估調研助手」自動完成調研，再將完整報告貼回本系統套版與輸出 PDF。此版本不使用 OpenAI API，因此不會額外產生 API 費。
            </p>
          </div>
          <div className="toolbar hero-actions">
            <a className="btn ghost" href={GPT_URL} target="_blank" rel="noreferrer">開啟調研 GPT</a>
            <button className="btn primary" onClick={printPdf} disabled={!hasReport}>輸出 PDF</button>
          </div>
        </div>
        <div className="status-row">
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
            <h2>輸入基本資料並前往 GPT 調研</h2>
            <p className="muted">填寫三個欄位後，複製提示詞，到 GPT 內貼上即可自動產出土地評估報告。</p>
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
                <strong>免費版流程</strong>
                <p>複製提示詞 → 開啟 GPT → 貼上並產出報告 → 回到本頁貼上完整報告。</p>
              </div>
              <div className="toolbar">
                <button className="btn" onClick={copyPrompt}>{copied ? '已複製' : '複製 GPT 提示詞'}</button>
                <a className="btn primary" href={GPT_URL} target="_blank" rel="noreferrer">前往 GPT</a>
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
            <pre className="text-report">{hasReport ? form.reportText : '尚未貼上土地評估報告。\n\n請先前往「海悅土地評估調研助手」輸入配合業主、調研日期與目標地號，產出完整報告後，複製並貼回本頁。'}</pre>
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
