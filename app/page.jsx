'use client';

import { useEffect, useMemo, useState } from 'react';

const today = new Date().toISOString().slice(0, 10);
const GPT_URL = 'https://chatgpt.com/g/g-6a03e60a20948191b57eb98f7cbf4672-hai-yue-tu-di-ping-gu-diao-yan-zhu-shou';
const emptyForm = { client: '', researchDate: today, landNumber: '', reportText: '' };
const emptyText = '未擷取到內容';
const createReportId = () => `hy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const FIELD_ALIASES = {
  client: ['配合業主', '業主', '建設公司'],
  researchDate: ['調研時間', '調研日期', '日期'],
  location: ['標的位置', '基地位置', '位置'],
  landNumbers: ['標的地號', '目標地號', '地號'],
  zoning: ['土地分區', '使用分區'],
  siteArea: ['基地面積', '土地面積'],
  coverage: ['法定建蔽率', '建蔽率'],
  far: ['法定容積率', '容積率'],
  roadCondition: ['臨路條件', '臨路', '道路條件'],
  landPrice: ['土地售價', '地主開價', '售價'],
  school: ['學區', '學區與里別'],
  village: ['里別', '行政里別'],
  siteCondition: ['基地現況', '基地四向現況', '四向現況', '基地四向'],
  traffic: ['交通動線', '交通'],
  livingFunctions: ['生活機能', '生活機能條件'],
  publicFacilities: ['公共建設', '公共設施'],
  salesStatus: ['區域銷況', '區域交易狀況', '市場銷況'],
  comparableCases: ['個案參考', '競案分析', '區域競案分析', '競案參考'],
  pricing: ['價格預判', '區域交易與價格預判', '價格建議'],
  product: ['建議產品', '產品建議', '本案產品規劃建議'],
  strength1: ['優勢一', '優勢1'],
  strength2: ['優勢二', '優勢2'],
  strength3: ['優勢三', '優勢3'],
  weakness1: ['劣勢一', '劣勢1'],
  weakness2: ['劣勢二', '劣勢2'],
  weakness3: ['劣勢三', '劣勢3'],
  conclusion: ['初步結論', '結論', '總結'],
  sources: ['資料來源', '參考資料'],
  reviewItems: ['待複核事項', '待複核', '下一步待補資料'],
};
const ALL_LABELS = Object.values(FIELD_ALIASES).flat();
const DIRECTION_LABELS = ['東向', '南向', '西向', '北向', '東側', '南側', '西側', '北側', '東北向', '東南向', '西南向', '西北向'];

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^[#\s]*([一二三四五六七八九十]+[、\.．]\s*)?/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function escapeRegExp(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function getSection(text, labels, allLabels = ALL_LABELS) {
  const normalized = normalizeText(text);
  const labelList = Array.isArray(labels) ? labels : [labels];
  const escapedTargets = labelList.map(escapeRegExp).join('|');
  const escapedAll = allLabels.map(escapeRegExp).join('|');
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${escapedTargets})\\s*[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${escapedAll})\\s*[：:]|$)`, 'i');
  const match = normalized.match(pattern);
  return match ? cleanValue(match[1]) : '';
}
function cleanValue(value) {
  return normalizeText(value)
    .replace(/^[-–—\s]+/gm, '')
    .replace(/\[\d+\]/g, '')
    .trim();
}
function fallbackLine(text, keywords) {
  const lines = normalizeText(text).split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => keywords.some((kw) => line.includes(kw))) || '';
}
function afterLabel(text, labels) {
  const lines = normalizeText(text).split('\n').map((line) => line.trim()).filter(Boolean);
  for (const label of labels) {
    const line = lines.find((item) => item.includes(label));
    if (line) return cleanValue(line.replace(new RegExp(`^.*${label}\\s*[：:]?\\s*`), ''));
  }
  return '';
}
function shortValue(value, limit = 90) {
  const text = cleanValue(value);
  if (!text || text === emptyText) return emptyText;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
function parseCases(raw) {
  const text = cleanValue(raw);
  if (!text) return [];
  const parts = text.split(/\n(?=\s*(?:\d+[\.、]|[一二三四五六七八九十]+、|競案[一二三四五六七八九十]?))/g).map((item) => item.trim()).filter(Boolean);
  return (parts.length > 1 ? parts : [text]).slice(0, 6).map((part, index) => {
    const firstLine = part.split('\n')[0] || '';
    const title = firstLine.replace(/^\s*\d+[\.、]\s*/, '').replace(/^[一二三四五六七八九十]+、\s*/, '').split(/[：:]/)[0].trim() || `競案 ${index + 1}`;
    return { title, content: part };
  });
}
function splitIntoReadableBlocks(text) {
  const normalized = cleanValue(text);
  if (!normalized || normalized === emptyText) return [emptyText];
  const blocks = normalized.split(/\n{2,}|(?=\n?[-•●]\s)|(?=\n?\d+[\.、]\s)/g).map((item) => cleanValue(item)).filter(Boolean);
  return blocks.length ? blocks : [normalized];
}
function parseReportText(input) {
  const rawText = normalizeText(input);
  const get = (key) => getSection(rawText, FIELD_ALIASES[key]);
  const siteRaw = get('siteCondition');
  const getDirection = (label) => getSection(siteRaw, label, DIRECTION_LABELS);
  const schoolRaw = get('school');
  const field = (value) => cleanValue(value) || emptyText;
  const strengths = [get('strength1'), get('strength2'), get('strength3')].map(field);
  const weaknesses = [get('weakness1'), get('weakness2'), get('weakness3')].map(field);
  return {
    rawText,
    basic: {
      client: field(get('client')),
      researchDate: field(get('researchDate')),
      location: field(get('location')),
      landNumbers: field(get('landNumbers')),
      zoning: field(get('zoning')),
      siteArea: field(get('siteArea')),
      coverage: field(get('coverage')),
      far: field(get('far')),
      roadCondition: field(get('roadCondition')),
      landPrice: field(get('landPrice')),
    },
    schoolAndVillage: {
      school: field(schoolRaw),
      elementarySchool: field(afterLabel(schoolRaw, ['國小', '國小學區', '國民小學'])),
      juniorHighSchool: field(afterLabel(schoolRaw, ['國中', '國中學區', '國民中學'])),
      village: field(get('village')),
    },
    siteCondition: {
      east: field(getDirection('東向') || getDirection('東側') || getDirection('東北向') || fallbackLine(siteRaw, ['東向', '東側', '基地東側'])),
      south: field(getDirection('南向') || getDirection('南側') || getDirection('東南向') || fallbackLine(siteRaw, ['南向', '南側', '基地南側'])),
      west: field(getDirection('西向') || getDirection('西側') || getDirection('西南向') || fallbackLine(siteRaw, ['西向', '西側', '基地西側'])),
      north: field(getDirection('北向') || getDirection('北側') || getDirection('西北向') || fallbackLine(siteRaw, ['北向', '北側', '基地北側'])),
      raw: field(siteRaw),
    },
    environment: {
      traffic: field(get('traffic')),
      livingFunctions: field(get('livingFunctions')),
      publicFacilities: field(get('publicFacilities')),
    },
    market: { salesStatus: field(get('salesStatus')), cases: parseCases(get('comparableCases')) },
    suggestion: { pricing: field(get('pricing')), product: field(get('product')) },
    evaluation: { strengths, weaknesses, conclusion: field(get('conclusion')) },
    sourceAndReview: { sources: field(get('sources')), reviewItems: field(get('reviewItems')) },
  };
}

function SectionHeading({ index, title, subtitle }) {
  return <div className="section-heading readable-heading"><span>{index}</span><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>;
}
function MetricCard({ label, value }) { return <div className="metric-card readable-metric"><small>{label}</small><strong>{shortValue(value)}</strong></div>; }
function InfoCard({ title, children, className = '' }) { return <section className={`info-card readable-card ${className}`}><h3>{title}</h3><div className="info-card-content">{children}</div></section>; }
function ReadableText({ text }) { return <>{splitIntoReadableBlocks(text).map((block, index) => <p key={index}>{block}</p>)}</>; }

function CardReport({ report }) {
  const summaryItems = [
    ['配合業主', report.basic.client], ['調研日期', report.basic.researchDate], ['土地分區', report.basic.zoning], ['基地面積', report.basic.siteArea],
    ['建蔽率 / 容積率', `${report.basic.coverage} / ${report.basic.far}`], ['臨路條件', report.basic.roadCondition], ['學區 / 里別', `${report.schoolAndVillage.school} / ${report.schoolAndVillage.village}`], ['價格預判', report.suggestion.pricing],
  ];
  const directions = [['東向', report.siteCondition.east], ['南向', report.siteCondition.south], ['西向', report.siteCondition.west], ['北向', report.siteCondition.north]];
  return <article className="card-report readable-report">
    <div className="report-brand-row"><div className="report-brand-lockup"><div className="report-brand-mark">H</div><div><div className="report-brand-title">HIYES</div><div className="report-brand-subtitle">海悅廣告｜土地評估系統</div></div></div><div className="report-brand-side"><span>土地開發初評</span><span>OWNER REPORT</span></div></div>
    <section className="report-section cover-section"><SectionHeading index="01" title="標的摘要總覽" subtitle="先看業主最關心的基地條件、分區、量體與價格方向。" /><div className="summary-grid owner-summary">{summaryItems.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}</div></section>
    <section className="report-section"><SectionHeading index="02" title="基本資料與法定量體" /><div className="owner-facts"><InfoCard title="標的位置"><ReadableText text={report.basic.location} /></InfoCard><InfoCard title="標的地號"><ReadableText text={report.basic.landNumbers} /></InfoCard><InfoCard title="土地分區與量體"><ReadableText text={`土地分區：${report.basic.zoning}\n\n基地面積：${report.basic.siteArea}\n\n建蔽率：${report.basic.coverage}\n\n容積率：${report.basic.far}`} /></InfoCard><InfoCard title="臨路條件與售價"><ReadableText text={`臨路條件：${report.basic.roadCondition}\n\n土地售價：${report.basic.landPrice}`} /></InfoCard></div></section>
    <section className="report-section"><SectionHeading index="03" title="學區、里別與基地現況" /><div className="owner-facts"><InfoCard title="學區與里別"><ReadableText text={`學區：${report.schoolAndVillage.school}\n\n里別：${report.schoolAndVillage.village}`} /></InfoCard><InfoCard title="基地四向現況"><div className="direction-list">{directions.map(([label, value]) => <div key={label}><strong>{label}</strong><p>{value}</p></div>)}</div></InfoCard></div></section>
    <section className="report-section"><SectionHeading index="04" title="環境條件與生活機能" /><div className="owner-facts"><InfoCard title="交通動線"><ReadableText text={report.environment.traffic} /></InfoCard><InfoCard title="生活機能"><ReadableText text={report.environment.livingFunctions} /></InfoCard><InfoCard title="公共建設"><ReadableText text={report.environment.publicFacilities} /></InfoCard></div></section>
    <section className="report-section"><SectionHeading index="05" title="區域銷況與競案參考" /><InfoCard title="區域銷況" className="accent"><ReadableText text={report.market.salesStatus} /></InfoCard><div className="owner-case-list">{(report.market.cases.length ? report.market.cases : [{ title: '競案參考', content: emptyText }]).map((item, index) => <InfoCard key={`${item.title}-${index}`} title={`個案參考 ${index + 1}｜${item.title}`}><ReadableText text={item.content} /></InfoCard>)}</div></section>
    <section className="report-section"><SectionHeading index="06" title="價格預判與產品建議" /><div className="owner-facts"><InfoCard title="價格預判" className="accent"><ReadableText text={report.suggestion.pricing} /></InfoCard><InfoCard title="建議產品"><ReadableText text={report.suggestion.product} /></InfoCard></div></section>
    <section className="report-section"><SectionHeading index="07" title="綜合評估" /><div className="swot-grid owner-swot"><div className="swot-card strengths"><h3>3 點優勢</h3>{report.evaluation.strengths.map((item, index) => <p key={index}><strong>優勢 {index + 1}</strong>{item}</p>)}</div><div className="swot-card weaknesses"><h3>3 點劣勢</h3>{report.evaluation.weaknesses.map((item, index) => <p key={index}><strong>劣勢 {index + 1}</strong>{item}</p>)}</div></div></section>
    <section className="report-section"><SectionHeading index="08" title="初步結論與待複核事項" /><div className="owner-facts"><InfoCard title="初步結論" className="accent"><ReadableText text={report.evaluation.conclusion} /></InfoCard><InfoCard title="資料來源與待複核"><ReadableText text={`資料來源：${report.sourceAndReview.sources}\n\n待複核事項：${report.sourceAndReview.reviewItems}`} /></InfoCard></div></section>
    <div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div>
  </article>;
}

export default function Page() {
  const [form, setForm] = useState(emptyForm);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('card');
  const [reportId, setReportId] = useState(createReportId);
  const [waiting, setWaiting] = useState(false);
  const [syncMessage, setSyncMessage] = useState('尚未開始等待 GPT 回傳。');
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const hasReport = form.reportText.trim().length > 0;
  const canOpenGpt = useMemo(() => form.client.trim() && form.landNumber.trim(), [form.client, form.landNumber]);
  const structuredReport = useMemo(() => parseReportText(form.reportText), [form.reportText]);
  const checkReturnedReport = async (silent = false) => {
    if (!reportId) return;
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}`);
      if (res.status === 404) { if (!silent) setSyncMessage('目前尚未收到 GPT 回傳報告，請稍後再試。'); return; }
      const data = await res.json();
      if (data?.report?.report_text) { setForm((prev) => ({ ...prev, reportText: data.report.report_text })); setWaiting(false); setSyncMessage('已收到 GPT 回傳報告，業主閱讀版已自動生成。'); setViewMode('card'); }
    } catch { if (!silent) setSyncMessage('檢查回傳報告時發生錯誤。'); }
  };
  useEffect(() => { if (!waiting || hasReport) return; const timer = setInterval(() => checkReturnedReport(true), 5000); return () => clearInterval(timer); }, [waiting, hasReport, reportId]);
  const printPdf = () => { document.title = makeFileName(form); window.print(); };
  const copyPrompt = async () => { await navigator.clipboard.writeText(buildPrompt(form, reportId)); setCopied(true); setTimeout(() => setCopied(false), 2500); };
  const openGptWithPrompt = async () => {
    if (!canOpenGpt) { alert('請先填寫配合業主與目標地號。'); return; }
    const prompt = buildPrompt(form, reportId);
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
    setWaiting(true); setSyncMessage(`等待 GPT 回傳報告中，report_id：${reportId}`);
    alert('提示詞已自動複製。\n\n接下來會開啟「海悅土地評估調研助手」。\n若 GPT 頁面沒有自動帶入文字，請在輸入框按 Command + V 貼上，再按送出即可開始調研。\n\n若 GPT Action 設定完成，調研結束後報告會自動回到本系統。');
    window.open(`${GPT_URL}?q=${encodeURIComponent(prompt)}&prompt=${encodeURIComponent(prompt)}`, '_blank', 'noopener,noreferrer');
  };
  const copyReport = async () => { if (!hasReport) return; await navigator.clipboard.writeText(form.reportText); alert('已複製完整報告。'); };
  const requestWord = () => alert('Word 輸出僅限戴異軒本人使用。免費版目前請由戴異軒本人複製報告內容後自行貼入 Word 編修；後續若要一鍵 DOCX 需升級後端權限版。');
  const reset = () => { setForm(emptyForm); setReportId(createReportId()); setWaiting(false); setSyncMessage('尚未開始等待 GPT 回傳。'); };
  return <main className="app-shell"><section className="hero-panel"><div className="hero-topbar"><div className="brand-lockup"><div className="brand-mark">H</div><div className="brand-copy"><div className="brand-copy-top">HIYES</div><div className="brand-copy-bottom">海悅廣告｜土地評估系統</div></div></div><div className="public-chip">Owner Report • GPT + PDF</div></div><div className="eyebrow">Hiyes Advertising Land Intelligence</div><div className="hero-content"><div><h1 className="app-title">土地評估業主閱讀版報告</h1><p className="app-subtitle">將 GPT 調研內容重新整理成業主可快速閱讀的寬版章節報告，不再輸出細長文字柱。</p></div><div className="toolbar hero-actions"><button className="btn ghost" onClick={reset}>清空</button><button className="btn primary" onClick={printPdf} disabled={!hasReport}>輸出 PDF</button></div></div><div className="status-row"><span>業主閱讀版</span><span>寬版章節</span><span>Action 自動回傳</span><span>PDF 可輸出</span><span>Word 僅限戴異軒</span></div></section><section className="workflow-grid"><section className="panel input-panel"><div className="panel-header compact"><p className="eyebrow small">Step 1</p><h2>輸入資料後進入 GPT 自動調研</h2><p className="muted">按自動調研後，系統會自動複製提示詞並開啟海悅土地評估調研助手。</p></div><div className="panel-body simple-form"><label className="field"><span>配合業主</span><input value={form.client} onChange={(e) => update('client', e.target.value)} placeholder="例如：弘峻建設" /></label><label className="field"><span>調研日期</span><input type="date" value={form.researchDate} onChange={(e) => update('researchDate', e.target.value)} /></label><label className="field"><span>目標地號</span><textarea rows={4} value={form.landNumber} onChange={(e) => update('landNumber', e.target.value)} placeholder="例如：桃園市中壢區中運段156、157、160地號" /></label><div className="sync-box"><strong>回傳編號 report_id</strong><code>{reportId}</code><p>{syncMessage}</p></div><div className="action-card"><div><strong>操作流程</strong><p>按自動調研 → GPT 調研 → Action 自動回傳，或手動複製結果貼回本頁。</p></div><div className="toolbar"><button className="btn" onClick={copyPrompt}>{copied ? '提示詞已複製' : '複製提示詞'}</button><button className="btn primary" onClick={openGptWithPrompt} disabled={!canOpenGpt}>自動調研</button><button className="btn" onClick={() => checkReturnedReport(false)}>檢查回傳</button></div></div></div></section><section className="panel preview-panel"><div className="panel-header preview-header"><div><p className="eyebrow small">Step 2</p><h2>生成業主閱讀版報告</h2><p className="muted">若 GPT Action 已回傳會自動生成；也可手動貼上 GPT 完整報告。</p></div><div className="toolbar"><button className="btn" onClick={copyReport} disabled={!hasReport}>複製全文</button><button className="btn primary" onClick={printPdf} disabled={!hasReport}>PDF</button><button className="btn locked" onClick={requestWord}>Word</button></div></div><div className="paste-area no-print"><label className="field"><span>貼上 GPT 產出的完整土地評估報告</span><textarea rows={10} value={form.reportText} onChange={(e) => update('reportText', e.target.value)} placeholder="請把海悅土地評估調研助手產出的完整報告貼在這裡。" /></label></div><div className="report-tabs no-print"><button className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')}>業主閱讀版</button><button className={viewMode === 'raw' ? 'active' : ''} onClick={() => setViewMode('raw')}>原文版</button></div>{hasReport ? (viewMode === 'card' ? <CardReport report={structuredReport} /> : <article className="report-paper raw-paper"><div className="report-brand-row"><div className="report-brand-title">HIYES｜原文版</div></div><pre className="text-report">{form.reportText}</pre><div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div></article>) : <article className="report-paper"><pre className="text-report">尚未貼上土地評估報告。\n\n請先輸入配合業主、調研日期與目標地號，點擊「自動調研」。若 GPT Action 已設定，調研完成後會自動回傳；也可手動複製 GPT 報告貼回本頁。</pre><div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div></article>}</section></section><footer className="designer-credit"><span>Designed by</span><strong>海悅機構｜海宇國際 戴異軒 製</strong></footer></main>;
}
