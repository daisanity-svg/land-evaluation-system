'use client';

import { useEffect, useMemo, useState } from 'react';

const today = new Date().toISOString().slice(0, 10);
const GPT_URL = 'https://chatgpt.com/g/g-6a03e60a20948191b57eb98f7cbf4672-hai-yue-tu-di-ping-gu-diao-yan-zhu-shou';
const emptyForm = { client: '', researchDate: today, landNumber: '', reportText: '' };
const createReportId = () => `hy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function fileName(form) {
  return `${form.client || '土地評估'}_${form.landNumber || '地號'}_${form.researchDate || today}`.replace(/[\\/:*?"<>|]/g, '-');
}

function buildPrompt(form, reportId) {
  return `請直接完成土地評估報告，並在完成後呼叫 submitReport 動作回傳結果。\n\n配合業主：${form.client || '＿＿建設'}\n調研日期：${form.researchDate || today}\n目標地號：${form.landNumber || '＿＿地號'}\nreport_id：${reportId}\n\n重要規則：\n1. 不要只回覆調研過程，不要只列待複核事項。\n2. 請在合理時間內直接產出完整報告；公開資料不足時，欄位內填「依公開資料初判／待複核」，不要因此停止。\n3. 報告必須使用以下固定欄位名稱，方便土地評估系統解析：\n配合業主：\n調研時間：\n標的位置：\n標的地號：\n土地分區：\n基地面積：\n法定建蔽率：\n法定容積率：\n臨路條件：\n土地售價：\n學區：\n里別：\n基地現況：\n東向：\n南向：\n西向：\n北向：\n交通動線：\n生活機能：\n公共建設：\n區域銷況：\n個案參考：\n價格預判：\n建議產品：\n優勢一：\n優勢二：\n優勢三：\n劣勢一：\n劣勢二：\n劣勢三：\n初步結論：\n資料來源：\n待複核事項：\n\n4. 完成完整報告後，請務必呼叫 submitReport 動作，參數如下：\nreport_id：${reportId}\nclient：${form.client || ''}\nland_number：${form.landNumber || ''}\nresearch_date：${form.researchDate || today}\nreport_text：完整土地評估報告全文\n\n5. submitReport 成功後，請只回覆：「報告已送回土地評估系統，請回到原系統查看業主閱讀版報告。」`;
}

function gptLink(prompt) {
  const encoded = encodeURIComponent(prompt);
  return `${GPT_URL}?q=${encoded}&prompt=${encoded}`;
}

function normalize(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function section(text, label) {
  const labels = ['配合業主','調研時間','標的位置','標的地號','土地分區','基地面積','法定建蔽率','法定容積率','臨路條件','土地售價','學區','里別','基地現況','東向','南向','西向','北向','交通動線','生活機能','公共建設','區域銷況','個案參考','價格預判','建議產品','優勢一','優勢二','優勢三','劣勢一','劣勢二','劣勢三','初步結論','資料來源','待複核事項'];
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const all = labels.map(esc).join('|');
  const pattern = new RegExp(`(?:^|\\n)\\s*${esc(label)}\\s*[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${all})\\s*[：:]|$)`, 'i');
  return normalize(text).match(pattern)?.[1]?.trim() || '依公開資料初判／待複核';
}
function P({ children }) { return <p>{children}</p>; }
function Card({ title, children, accent = false }) { return <section className={`info-card readable-card ${accent ? 'accent' : ''}`}><h3>{title}</h3>{children}</section>; }
function Metric({ label, value }) { return <div className="metric-card readable-metric"><small>{label}</small><strong>{String(value || '待複核').slice(0, 120)}</strong></div>; }
function Heading({ index, title, subtitle }) { return <div className="section-heading readable-heading"><span>{index}</span><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>; }

function Report({ text }) {
  const get = (label) => section(text, label);
  return <article className="card-report readable-report">
    <div className="report-brand-row"><div className="report-brand-lockup"><div className="report-brand-mark">H</div><div><div className="report-brand-title">HIYES</div><div className="report-brand-subtitle">海悅廣告｜土地評估系統</div></div></div><div className="report-brand-side"><span>土地開發初評</span><span>OWNER REPORT</span></div></div>
    <section className="report-section cover-section"><Heading index="01" title="標的摘要總覽" subtitle="先看業主最關心的基地條件、分區、量體與價格方向。" /><div className="summary-grid owner-summary"><Metric label="配合業主" value={get('配合業主')} /><Metric label="調研日期" value={get('調研時間')} /><Metric label="土地分區" value={get('土地分區')} /><Metric label="基地面積" value={get('基地面積')} /><Metric label="建蔽率 / 容積率" value={`${get('法定建蔽率')} / ${get('法定容積率')}`} /><Metric label="臨路條件" value={get('臨路條件')} /><Metric label="學區 / 里別" value={`${get('學區')} / ${get('里別')}`} /><Metric label="價格預判" value={get('價格預判')} /></div></section>
    <section className="report-section"><Heading index="02" title="基本資料與法定量體" /><div className="owner-facts"><Card title="標的位置"><P>{get('標的位置')}</P></Card><Card title="標的地號"><P>{get('標的地號')}</P></Card><Card title="土地分區與量體"><P>土地分區：{get('土地分區')}</P><P>基地面積：{get('基地面積')}</P><P>建蔽率：{get('法定建蔽率')}</P><P>容積率：{get('法定容積率')}</P></Card><Card title="臨路條件與售價"><P>臨路條件：{get('臨路條件')}</P><P>土地售價：{get('土地售價')}</P></Card></div></section>
    <section className="report-section"><Heading index="03" title="學區、里別與基地現況" /><div className="owner-facts"><Card title="學區與里別"><P>{get('學區')}</P><P>{get('里別')}</P></Card><Card title="基地四向現況"><div className="direction-list"><div><strong>東向</strong><p>{get('東向')}</p></div><div><strong>南向</strong><p>{get('南向')}</p></div><div><strong>西向</strong><p>{get('西向')}</p></div><div><strong>北向</strong><p>{get('北向')}</p></div></div></Card></div></section>
    <section className="report-section"><Heading index="04" title="環境條件與生活機能" /><div className="owner-facts"><Card title="交通動線"><P>{get('交通動線')}</P></Card><Card title="生活機能"><P>{get('生活機能')}</P></Card><Card title="公共建設"><P>{get('公共建設')}</P></Card></div></section>
    <section className="report-section"><Heading index="05" title="區域銷況與競案參考" /><Card title="區域銷況" accent><P>{get('區域銷況')}</P></Card><div className="owner-case-list"><Card title="個案參考"><P>{get('個案參考')}</P></Card></div></section>
    <section className="report-section"><Heading index="06" title="價格預判與產品建議" /><div className="owner-facts"><Card title="價格預判" accent><P>{get('價格預判')}</P></Card><Card title="建議產品"><P>{get('建議產品')}</P></Card></div></section>
    <section className="report-section"><Heading index="07" title="綜合評估" /><div className="swot-grid owner-swot"><div className="swot-card strengths"><h3>3 點優勢</h3><P><strong>優勢 1</strong>{get('優勢一')}</P><P><strong>優勢 2</strong>{get('優勢二')}</P><P><strong>優勢 3</strong>{get('優勢三')}</P></div><div className="swot-card weaknesses"><h3>3 點劣勢</h3><P><strong>劣勢 1</strong>{get('劣勢一')}</P><P><strong>劣勢 2</strong>{get('劣勢二')}</P><P><strong>劣勢 3</strong>{get('劣勢三')}</P></div></div></section>
    <section className="report-section"><Heading index="08" title="初步結論與待複核事項" /><div className="owner-facts"><Card title="初步結論" accent><P>{get('初步結論')}</P></Card><Card title="資料來源與待複核"><P>資料來源：{get('資料來源')}</P><P>待複核事項：{get('待複核事項')}</P></Card></div></section>
    <div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div>
  </article>;
}

export default function Page() {
  const [form, setForm] = useState(emptyForm);
  const [reportId, setReportId] = useState(createReportId);
  const [waiting, setWaiting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('card');
  const [syncMessage, setSyncMessage] = useState('尚未開始等待 GPT 回傳。');
  const [lastLink, setLastLink] = useState('');
  const hasReport = form.reportText.trim().length > 0;
  const canOpen = form.client.trim() && form.landNumber.trim();
  const prompt = useMemo(() => buildPrompt(form, reportId), [form, reportId]);
  const setField = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  async function checkReturnedReport(silent = false) {
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}`);
      if (res.status === 404) { if (!silent) setSyncMessage('目前尚未收到 GPT 回傳報告。'); return; }
      const data = await res.json();
      if (data?.report?.report_text) {
        setForm((old) => ({ ...old, reportText: data.report.report_text }));
        setWaiting(false);
        setViewMode('card');
        setSyncMessage('已收到 GPT 回傳報告，業主閱讀版已自動生成。');
      }
    } catch {
      if (!silent) setSyncMessage('檢查回傳報告時發生錯誤。');
    }
  }

  useEffect(() => {
    if (!waiting || hasReport) return;
    const timer = setInterval(() => checkReturnedReport(true), 5000);
    return () => clearInterval(timer);
  }, [waiting, hasReport, reportId]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }
  async function openGpt() {
    if (!canOpen) { alert('請先填寫配合業主與目標地號。'); return; }
    const link = gptLink(prompt);
    setLastLink(link);
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch {}
    setWaiting(true);
    setSyncMessage(`已開啟海悅土地評估助手，等待 GPT Action 回傳。report_id：${reportId}`);
    window.open(link, '_blank');
  }
  function reset() { setForm(emptyForm); setReportId(createReportId()); setWaiting(false); setSyncMessage('尚未開始等待 GPT 回傳。'); setLastLink(''); }
  function printPdf() { document.title = fileName(form); window.print(); }
  async function copyReport() { if (hasReport) { await navigator.clipboard.writeText(form.reportText); alert('已複製完整報告。'); } }

  return <main className="app-shell"><section className="hero-panel"><div className="hero-topbar"><div className="brand-lockup"><div className="brand-mark">H</div><div className="brand-copy"><div className="brand-copy-top">HIYES</div><div className="brand-copy-bottom">海悅廣告｜土地評估系統</div></div></div><div className="public-chip">Owner Report • GPT + PDF</div></div><div className="eyebrow">Hiyes Advertising Land Intelligence</div><div className="hero-content"><div><h1 className="app-title">土地評估業主閱讀版報告</h1><p className="app-subtitle">輸入業主與地號後，自動開啟海悅土地評估助手；完成後透過 Action 回傳並生成報告。</p></div><div className="toolbar hero-actions"><button className="btn ghost" onClick={reset}>清空</button><button className="btn primary" onClick={printPdf} disabled={!hasReport}>輸出 PDF</button></div></div><div className="status-row"><span>業主閱讀版</span><span>自動開啟 GPT 助手</span><span>Action 自動回傳</span><span>PDF 可輸出</span><span>Word 僅限戴異軒</span></div></section><section className="workflow-grid"><section className="panel input-panel"><div className="panel-header compact"><p className="eyebrow small">Step 1</p><h2>輸入資料後進入 GPT 自動調研</h2><p className="muted">按自動調研後，系統會自動複製提示詞並開啟海悅土地評估助手。</p></div><div className="panel-body simple-form"><label className="field"><span>配合業主</span><input value={form.client} onChange={(e) => setField('client', e.target.value)} placeholder="例如：弘峻建設" /></label><label className="field"><span>調研日期</span><input type="date" value={form.researchDate} onChange={(e) => setField('researchDate', e.target.value)} /></label><label className="field"><span>目標地號</span><textarea rows={4} value={form.landNumber} onChange={(e) => setField('landNumber', e.target.value)} placeholder="例如：桃園市中壢區中運段156、157、160地號" /></label><div className="sync-box"><strong>回傳編號 report_id</strong><code>{reportId}</code><p>{syncMessage}</p>{lastLink && <a className="fallback-link" href={lastLink} target="_blank" rel="noreferrer">開啟海悅土地評估助手</a>}</div><div className="action-card"><div><strong>操作流程</strong><p>按自動調研 → GPT 完成報告 → submitReport 自動回傳 → 本頁生成業主閱讀版。</p></div><div className="toolbar"><button className="btn" onClick={copyPrompt}>{copied ? '提示詞已複製' : '複製提示詞'}</button><button className="btn primary" onClick={openGpt} disabled={!canOpen}>自動調研</button><button className="btn" onClick={() => checkReturnedReport(false)}>檢查回傳</button></div></div></div></section><section className="panel preview-panel"><div className="panel-header preview-header"><div><p className="eyebrow small">Step 2</p><h2>生成業主閱讀版報告</h2><p className="muted">若 GPT Action 已回傳會自動生成；也可手動貼上完整報告。</p></div><div className="toolbar"><button className="btn" onClick={copyReport} disabled={!hasReport}>複製全文</button><button className="btn primary" onClick={printPdf} disabled={!hasReport}>PDF</button><button className="btn locked" onClick={() => alert('Word 輸出僅限戴異軒本人使用。')}>Word</button></div></div><div className="paste-area no-print"><label className="field"><span>貼上 GPT 產出的完整土地評估報告</span><textarea rows={10} value={form.reportText} onChange={(e) => setField('reportText', e.target.value)} placeholder="若 Action 沒自動回傳，也可以手動貼上 GPT 報告。" /></label></div><div className="report-tabs no-print"><button className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')}>業主閱讀版</button><button className={viewMode === 'raw' ? 'active' : ''} onClick={() => setViewMode('raw')}>原文版</button></div>{hasReport ? (viewMode === 'card' ? <Report text={form.reportText} /> : <article className="report-paper raw-paper"><div className="report-brand-row"><div className="report-brand-title">HIYES｜原文版</div></div><pre className="text-report">{form.reportText}</pre><div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div></article>) : <article className="report-paper"><pre className="text-report">尚未收到土地評估報告。\n\n請先輸入配合業主、調研日期與目標地號，點擊「自動調研」。若 GPT Action 正常執行，完成後會自動回傳到此處。</pre><div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div></article>}</section></section><footer className="designer-credit"><span>Designed by</span><strong>海悅機構｜海宇國際 戴異軒 製</strong></footer></main>;
}
