'use client';

import { useMemo, useState } from 'react';

const today = new Date().toISOString().slice(0, 10);

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
  landPrice: '',
  specifiedCases: '',
};

export default function Page() {
  const [form, setForm] = useState(emptyForm);
  const [reportText, setReportText] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canResearch = useMemo(() => form.client.trim() && form.landNumber.trim(), [form.client, form.landNumber]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const startResearch = async () => {
    if (!canResearch) {
      setError('請至少填寫「配合業主」與「目標地號」。');
      return;
    }

    setLoading(true);
    setError('');
    setReportText('');
    setSources([]);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '自動調研失敗，請稍後再試。');

      setReportText(data.reportText || '');
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (err) {
      setError(err.message || '自動調研失敗。');
    } finally {
      setLoading(false);
    }
  };

  const printPdf = () => {
    document.title = makeFileName(form);
    window.print();
  };

  const copyReport = async () => {
    if (!reportText) return;
    await navigator.clipboard.writeText(reportText);
    alert('已複製完整報告。');
  };

  const requestWord = () => {
    alert('Word 輸出僅限戴異軒本人登入後使用。下一階段會加入登入權限與 DOCX 下載。');
  };

  const reset = () => {
    setForm(emptyForm);
    setReportText('');
    setSources([]);
    setError('');
  };

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
          <div className="public-chip">Public Link • PDF Ready</div>
        </div>

        <div className="eyebrow">Hiyes Advertising Land Intelligence</div>
        <div className="hero-content">
          <div>
            <h1 className="app-title">輸入地號，自動產出土地評估報告</h1>
            <p className="app-subtitle">
              公開使用者只要輸入配合業主與目標地號，即可產出報告並輸出 PDF；Word 版本僅限戴異軒本人登入後使用。
            </p>
          </div>
          <div className="toolbar hero-actions">
            <button className="btn ghost" onClick={reset}>清空</button>
            <button className="btn primary" onClick={printPdf} disabled={!reportText}>輸出 PDF</button>
          </div>
        </div>
        <div className="status-row">
          <span>輸入地號即可開始</span>
          <span>自動調研產報告</span>
          <span>公開使用者可輸出 PDF</span>
          <span>Word 僅限戴異軒</span>
          <span>海悅識別海藍風格</span>
        </div>
      </section>

      <section className="workflow-grid">
        <section className="panel input-panel">
          <div className="panel-header compact">
            <p className="eyebrow small">Research Input</p>
            <h2>輸入調研條件</h2>
            <p className="muted">一般使用者只需要填寫三個主要欄位：配合業主、調研日期、目標地號。</p>
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
            <details className="optional-fields">
              <summary>進階選填</summary>
              <label className="field">
                <span>土地售價</span>
                <input value={form.landPrice} onChange={(e) => update('landPrice', e.target.value)} placeholder="未提供可留空" />
              </label>
              <label className="field">
                <span>指定競案</span>
                <textarea rows={3} value={form.specifiedCases} onChange={(e) => update('specifiedCases', e.target.value)} placeholder="未指定則由系統自主篩選周邊競案" />
              </label>
            </details>
            {error && <div className="error-box">{error}</div>}
            <button className="btn primary research-btn" onClick={startResearch} disabled={loading || !canResearch}>
              {loading ? '調研中，請稍候…' : '開始自動調研'}
            </button>
            <p className="hint-text">正式自動調研需在 Vercel 設定 OPENAI_API_KEY。未設定時系統會提示環境變數尚未完成。</p>
          </div>
        </section>

        <section className="panel preview-panel">
          <div className="panel-header preview-header">
            <div>
              <p className="eyebrow small">Report Output</p>
              <h2>土地評估報告</h2>
              <p className="muted">報告完成後可輸出 PDF；Word 下載需本人權限。</p>
            </div>
            <div className="toolbar">
              <button className="btn" onClick={copyReport} disabled={!reportText}>複製全文</button>
              <button className="btn primary" onClick={printPdf} disabled={!reportText}>PDF</button>
              <button className="btn locked" onClick={requestWord}>Word</button>
            </div>
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

            <pre className="text-report">
              {reportText || '請先輸入配合業主與目標地號，點擊「開始自動調研」。\n\n系統將自動產出包含：基本資料、法定量體、基地四向現況、交通生活機能、學區里別、競案分析、價格預判、產品建議、綜合評估與待複核事項的土地評估報告。'}
            </pre>

            {sources.length > 0 && (
              <div className="source-list">
                <strong>參考來源</strong>
                {sources.map((source, index) => (
                  <a key={index} href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a>
                ))}
              </div>
            )}

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
