'use client';

import { useState } from 'react';

const SAMPLE_PLACEHOLDER = `貼上符合 hermes-research-package.schema.json 的完整 JSON 證據包`;

export default function ResearchReviewPage() {
  const [payload, setPayload] = useState('');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('尚未驗收。此頁不會寫入報告、資料庫或正式系統。');
  const [loading, setLoading] = useState(false);

  async function validatePackage() {
    setResult(null);

    try {
      JSON.parse(payload);
    } catch {
      setMessage('JSON 格式不正確，請修正後再驗收。');
      return;
    }

    setLoading(true);
    setMessage('正在執行研究品質驗收…');

    try {
      const response = await fetch('/api/research/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const data = await response.json();
      setResult(data);
      setMessage(data.accepted
        ? '驗收通過：此證據包可進入人工判讀與正式報告準備。'
        : '驗收未通過：請依阻塞事項補證據或保留待人工複核。');
    } catch (error) {
      setMessage(`驗收失敗：${error.message || '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  }

  const errors = result?.result?.errors || [];
  const blockingReasons = result?.result?.quality_gate?.blocking_reasons || [];

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-topbar">
          <div className="brand-lockup">
            <div className="brand-mark">H</div>
            <div className="brand-copy">
              <div className="brand-copy-top">HIYES</div>
              <div className="brand-copy-bottom">土地評估系統｜內部調研驗收台</div>
            </div>
          </div>
          <a className="btn ghost" href="/">返回業主版報告系統</a>
        </div>
        <div className="hero-content">
          <div>
            <p className="eyebrow">Internal Research Gate</p>
            <h1 className="app-title">結構化調研證據驗收</h1>
            <p className="app-subtitle">先確認來源、衝突、法規、面積、道路與價格是否足以採用；本頁不會產出或送出正式報告。</p>
          </div>
        </div>
      </section>

      <section className="panel input-panel" style={{ marginTop: 24 }}>
        <div className="panel-header compact">
          <p className="eyebrow small">Step 1</p>
          <h2>貼上調研證據包</h2>
          <p className="muted">僅接受完整 JSON。無法證實的欄位應保留 null，並標記 needs_manual_review。</p>
        </div>
        <div className="panel-body simple-form">
          <label className="field">
            <span>研究包 JSON</span>
            <textarea rows={18} value={payload} onChange={(event) => setPayload(event.target.value)} placeholder={SAMPLE_PLACEHOLDER} spellCheck="false" />
          </label>
          <div className="action-card">
            <div>
              <strong>驗收狀態</strong>
              <p>{message}</p>
            </div>
            <button className="btn primary" onClick={validatePackage} disabled={loading || !payload.trim()}>
              {loading ? '驗收中…' : '執行研究品質驗收'}
            </button>
          </div>
        </div>
      </section>

      {result && (
        <section className="panel preview-panel" style={{ marginTop: 24 }}>
          <div className="panel-header compact">
            <p className="eyebrow small">Step 2</p>
            <h2>{result.accepted ? '可採用，等待人工判讀' : '不可採用，需補查'}</h2>
            <p className="muted">驗收結果不會自動寫入任何正式報告。</p>
          </div>
          <div className="panel-body">
            {errors.length > 0 && <>
              <h3>欄位錯誤</h3>
              <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </>}
            {blockingReasons.length > 0 && <>
              <h3>阻塞原因</h3>
              <ul>{blockingReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </>}
            {errors.length === 0 && blockingReasons.length === 0 && <p>未發現阻塞事項。</p>}
          </div>
        </section>
      )}
    </main>
  );
}
