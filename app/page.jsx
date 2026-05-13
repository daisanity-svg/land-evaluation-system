'use client';

import { useMemo, useState } from 'react';

const today = new Date().toISOString().slice(0, 10);
const GPT_URL = 'https://chatgpt.com/g/g-6a03e60a20948191b57eb98f7cbf4672-hai-yue-tu-di-ping-gu-diao-yan-zhu-shou';

const FIELD_LABELS = [
  '配合業主','調研時間','標的位置','標的地號','土地分區','基地面積','法定建蔽率','法定容積率','臨路條件','土地售價','學區','里別','基地現況','交通動線','生活機能','公共建設','區域銷況','建議產品','個案參考','價格預判','綜合評估','優勢一','優勢二','優勢三','劣勢一','劣勢二','劣勢三','初步結論','資料來源','待複核事項'
];

const DIRECTION_LABELS = ['東向','南向','西向','北向','東北向','東南向','西南向','西北向','東側','南側','西側','北側'];

const emptyForm = { client: '', researchDate: today, landNumber: '', reportText: '' };

const emptyText = '未擷取到內容';

const makeFileName = ({ client, landNumber, researchDate }) => {
  const safeClient = client || '土地評估';
  const safeLand = landNumber || '地號';
  const safeDate = researchDate || today;
  return `${safeClient}_${safeLand}_${safeDate}`.replace(/[\\/:*?"<>|]/g, '-');
};

const buildPrompt = ({ client, researchDate, landNumber }) => `幫我做土地評估，配合業主：${client || '＿＿建設'}，調研日期：${researchDate || '今天'}，目標地號：${landNumber || '＿＿地號'}。\n\n請依海悅土地評估格式，調查這筆土地並產出完整報告。請包含土地分區、建蔽率、容積率、基地面積、學區、里別、基地四向現況、交通動線、生活機能、公共建設、區域銷況、競案分析、建議產品、價格預判、綜合評估、資料來源與待複核事項。`;

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSection(text, label, labels) {
  const normalized = normalizeText(text);
  const escapedLabels = labels.map(escapeRegExp).join('|');
  const pattern = new RegExp(`${escapeRegExp(label)}\\s*[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${escapedLabels})\\s*[：:]|$)`, 'i');
  const match = normalized.match(pattern);
  return match ? match[1].trim() : '';
}

function extractLineByKeywords(text, keywords) {
  const lines = normalizeText(text).split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => keywords.some((keyword) => line.includes(keyword))) || '';
}

function extractAfterLabel(text, labels) {
  const lines = normalizeText(text).split('\n').map((line) => line.trim()).filter(Boolean);
  for (const label of labels) {
    const line = lines.find((item) => item.includes(label));
    if (line) return line.replace(new RegExp(`^.*${label}\\s*[：:]?\\s*`), '').trim();
  }
  return '';
}

function parseComparableCases(raw) {
  const text = normalizeText(raw);
  if (!text) return [];
  const parts = text.split(/\n(?=\s*(?:\d+[\.、]|[一二三四五六七八九十]+、))/g).map((item) => item.trim()).filter(Boolean);
  const items = parts.length > 1 ? parts : [text];
  return items.slice(0, 6).map((part, index) => {
    const firstLine = part.split('\n')[0] || '';
    const title = firstLine.replace(/^\s*\d+[\.、]\s*/, '').replace(/^[一二三四五六七八九十]+、\s*/, '').split(/[：:]/)[0].trim() || `競案 ${index + 1}`;
    return { title, content: part };
  });
}

function parseReportText(input) {
  const rawText = normalizeText(input);
  const get = (label) => getSection(rawText, label, FIELD_LABELS);
  const siteRaw = get('基地現況');
  const getDirection = (label) => getSection(siteRaw, label, DIRECTION_LABELS);
  const schoolRaw = get('學區');
  const evaluationRaw = get('綜合評估');

  const field = (value) => value || emptyText;

  const strengths = [get('優勢一'), get('優勢二'), get('優勢三')].map(field);
  const weaknesses = [get('劣勢一'), get('劣勢二'), get('劣勢三')].map(field);

  return {
    rawText,
    basic: {
      client: field(get('配合業主')),
      researchDate: field(get('調研時間')),
      location: field(get('標的位置')),
      landNumbers: field(get('標的地號')),
      zoning: field(get('土地分區')),
      siteArea: field(get('基地面積')),
      coverage: field(get('法定建蔽率')),
      far: field(get('法定容積率')),
      roadCondition: field(get('臨路條件')),
      landPrice: field(get('土地售價')),
    },
    schoolAndVillage: {
      school: field(schoolRaw),
      elementarySchool: field(extractAfterLabel(schoolRaw, ['國小', '國小學區', '國民小學'])),
      juniorHighSchool: field(extractAfterLabel(schoolRaw, ['國中', '國中學區', '國民中學'])),
      village: field(get('里別')),
    },
    siteCondition: {
      east: field(getDirection('東向') || getDirection('東側') || getDirection('東北向') || extractLineByKeywords(siteRaw, ['東向', '東側', '基地東側'])),
      south: field(getDirection('南向') || getDirection('南側') || getDirection('東南向') || extractLineByKeywords(siteRaw, ['南向', '南側', '基地南側'])),
      west: field(getDirection('西向') || getDirection('西側') || getDirection('西南向') || extractLineByKeywords(siteRaw, ['西向', '西側', '基地西側'])),
      north: field(getDirection('北向') || getDirection('北側') || getDirection('西北向') || extractLineByKeywords(siteRaw, ['北向', '北側', '基地北側'])),
      raw: field(siteRaw),
    },
    environment: {
      traffic: field(get('交通動線')),
      livingFunctions: field(get('生活機能')),
      publicFacilities: field(get('公共建設')),
    },
    market: {
      salesStatus: field(get('區域銷況')),
      cases: parseComparableCases(get('個案參考')),
    },
    suggestion: {
      product: field(get('建議產品')),
      pricing: field(get('價格預判')),
    },
    evaluation: { strengths, weaknesses, raw: field(evaluationRaw), conclusion: field(get('初步結論')) },
    sourceAndReview: { sources: field(get('資料來源')), reviewItems: field(get('待複核事項')) },
  };
}

function SectionHeading({ index, title }) {
  return <div className="section-heading"><span>{index}</span><h2>{title}</h2></div>;
}

function MetricCard({ label, value }) {
  return <div className="metric-card"><small>{label}</small><strong>{value}</strong></div>;
}

function InfoCard({ title, children, className = '' }) {
  return <section className={`info-card ${className}`}><h3>{title}</h3><div className="info-card-content">{children}</div></section>;
}

function CardReport({ report }) {
  const summaryItems = [
    ['配合業主', report.basic.client], ['調研日期', report.basic.researchDate], ['標的位置', report.basic.location], ['標的地號', report.basic.landNumbers],
    ['土地分區', report.basic.zoning], ['基地面積', report.basic.siteArea], ['建蔽率 / 容積率', `${report.basic.coverage} / ${report.basic.far}`], ['臨路條件', report.basic.roadCondition],
  ];

  const directions = [['東向', report.siteCondition.east], ['南向', report.siteCondition.south], ['西向', report.siteCondition.west], ['北向', report.siteCondition.north]];

  return <article className="card-report">
    <div className="report-brand-row"><div className="report-brand-lockup"><div className="report-brand-mark">H</div><div><div className="report-brand-title">HIYES</div><div className="report-brand-subtitle">海悅廣告｜土地評估系統</div></div></div><div className="report-brand-side"><span>土地開發初評</span><span>CARD REPORT</span></div></div>

    <section className="report-section cover-section"><SectionHeading index="01" title="標的摘要總覽" /><div className="summary-grid">{summaryItems.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}</div></section>

    <section className="report-section"><SectionHeading index="02" title="基本資料與法定量體" /><div className="card-grid two"><InfoCard title="標的位置"><p>{report.basic.location}</p></InfoCard><InfoCard title="標的地號"><p>{report.basic.landNumbers}</p></InfoCard><InfoCard title="土地分區"><p>{report.basic.zoning}</p></InfoCard><InfoCard title="基地面積"><p>{report.basic.siteArea}</p></InfoCard><InfoCard title="建蔽率 / 容積率"><p>{report.basic.coverage}</p><p>{report.basic.far}</p></InfoCard><InfoCard title="臨路條件 / 土地售價"><p>{report.basic.roadCondition}</p><p>{report.basic.landPrice}</p></InfoCard></div></section>

    <section className="report-section"><SectionHeading index="03" title="學區與行政里別" /><div className="summary-grid three"><MetricCard label="國小學區" value={report.schoolAndVillage.elementarySchool} /><MetricCard label="國中學區" value={report.schoolAndVillage.juniorHighSchool} /><MetricCard label="里別" value={report.schoolAndVillage.village} /></div><InfoCard title="學區補充"><p>{report.schoolAndVillage.school}</p></InfoCard></section>

    <section className="report-section"><SectionHeading index="04" title="基地四向現況" /><div className="direction-grid">{directions.map(([label, value]) => <div className="direction-card" key={label}><span>{label}</span><p>{value}</p></div>)}</div></section>

    <section className="report-section"><SectionHeading index="05" title="環境與生活機能" /><div className="card-grid three"><InfoCard title="交通動線"><p>{report.environment.traffic}</p></InfoCard><InfoCard title="生活機能"><p>{report.environment.livingFunctions}</p></InfoCard><InfoCard title="公共建設"><p>{report.environment.publicFacilities}</p></InfoCard></div></section>

    <section className="report-section"><SectionHeading index="06" title="區域銷況與競案分析" /><InfoCard title="區域銷況" className="accent"><p>{report.market.salesStatus}</p></InfoCard><div className="case-grid">{(report.market.cases.length ? report.market.cases : [{ title: '競案參考', content: emptyText }]).map((item, index) => <div className="case-card" key={`${item.title}-${index}`}><small>個案參考 {index + 1}</small><h3>{item.title}</h3><p>{item.content}</p></div>)}</div></section>

    <section className="report-section"><SectionHeading index="07" title="價格預判與產品建議" /><div className="card-grid two"><InfoCard title="價格預判" className="accent"><p>{report.suggestion.pricing}</p></InfoCard><InfoCard title="建議產品"><p>{report.suggestion.product}</p></InfoCard></div></section>

    <section className="report-section"><SectionHeading index="08" title="綜合評估" /><div className="swot-grid"><div className="swot-card strengths"><h3>3 點優勢</h3>{report.evaluation.strengths.map((item, index) => <p key={index}><strong>優勢 {index + 1}</strong>{item}</p>)}</div><div className="swot-card weaknesses"><h3>3 點劣勢</h3>{report.evaluation.weaknesses.map((item, index) => <p key={index}><strong>劣勢 {index + 1}</strong>{item}</p>)}</div></div></section>

    <section className="report-section"><SectionHeading index="09" title="初步結論" /><InfoCard title="結論摘要" className="accent"><p>{report.evaluation.conclusion}</p></InfoCard></section>

    <section className="report-section muted-section"><SectionHeading index="10" title="資料來源與待複核事項" /><div className="card-grid two"><InfoCard title="資料來源"><p>{report.sourceAndReview.sources}</p></InfoCard><InfoCard title="待複核事項"><p>{report.sourceAndReview.reviewItems}</p></InfoCard></div></section>

    <div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div>
  </article>;
}

export default function Page() {
  const [form, setForm] = useState(emptyForm);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('card');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const hasReport = form.reportText.trim().length > 0;
  const canOpenGpt = useMemo(() => form.client.trim() && form.landNumber.trim(), [form.client, form.landNumber]);
  const structuredReport = useMemo(() => parseReportText(form.reportText), [form.reportText]);

  const printPdf = () => { document.title = makeFileName(form); window.print(); };
  const copyPrompt = async () => { await navigator.clipboard.writeText(buildPrompt(form)); setCopied(true); setTimeout(() => setCopied(false), 2500); };
  const openGptWithPrompt = async () => {
    if (!canOpenGpt) { alert('請先填寫配合業主與目標地號。'); return; }
    const prompt = buildPrompt(form);
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
    alert('提示詞已自動複製。\n\n接下來會開啟「海悅土地評估調研助手」。\n若 GPT 頁面沒有自動帶入文字，請在輸入框按 Command + V 貼上，再按送出即可開始調研。');
    window.open(`${GPT_URL}?q=${encodeURIComponent(prompt)}&prompt=${encodeURIComponent(prompt)}`, '_blank', 'noopener,noreferrer');
  };
  const copyReport = async () => { if (!hasReport) return; await navigator.clipboard.writeText(form.reportText); alert('已複製完整報告。'); };
  const requestWord = () => alert('Word 輸出僅限戴異軒本人使用。免費版目前請由戴異軒本人複製報告內容後自行貼入 Word 編修；後續若要一鍵 DOCX 需升級後端權限版。');
  const reset = () => setForm(emptyForm);

  return <main className="app-shell">
    <section className="hero-panel"><div className="hero-topbar"><div className="brand-lockup"><div className="brand-mark">H</div><div className="brand-copy"><div className="brand-copy-top">HIYES</div><div className="brand-copy-bottom">海悅廣告｜土地評估系統</div></div></div><div className="public-chip">Card Report • GPT + PDF</div></div><div className="eyebrow">Hiyes Advertising Land Intelligence</div><div className="hero-content"><div><h1 className="app-title">土地評估圖卡版報告生成器</h1><p className="app-subtitle">輸入資料進入 GPT 調研，將結果貼回本系統後，自動轉成業主容易閱讀的圖卡版報告，並可輸出 PDF。</p></div><div className="toolbar hero-actions"><button className="btn ghost" onClick={reset}>清空</button><button className="btn primary" onClick={printPdf} disabled={!hasReport}>輸出 PDF</button></div></div><div className="status-row"><span>GPT 自動調研</span><span>圖卡版報告</span><span>原文版保留</span><span>PDF 可輸出</span><span>Word 僅限戴異軒</span></div></section>

    <section className="workflow-grid"><section className="panel input-panel"><div className="panel-header compact"><p className="eyebrow small">Step 1</p><h2>輸入資料後進入 GPT 自動調研</h2><p className="muted">按自動調研後，系統會自動複製提示詞並開啟海悅土地評估調研助手。</p></div><div className="panel-body simple-form"><label className="field"><span>配合業主</span><input value={form.client} onChange={(e) => update('client', e.target.value)} placeholder="例如：弘峻建設" /></label><label className="field"><span>調研日期</span><input type="date" value={form.researchDate} onChange={(e) => update('researchDate', e.target.value)} /></label><label className="field"><span>目標地號</span><textarea rows={4} value={form.landNumber} onChange={(e) => update('landNumber', e.target.value)} placeholder="例如：桃園市中壢區中運段156、157、160地號" /></label><div className="action-card"><div><strong>免費版操作流程</strong><p>按自動調研 → 提示詞自動複製 → 開啟 GPT → 貼上送出 → 複製結果回本頁。</p></div><div className="toolbar"><button className="btn" onClick={copyPrompt}>{copied ? '提示詞已複製' : '複製提示詞'}</button><button className="btn primary" onClick={openGptWithPrompt} disabled={!canOpenGpt}>自動調研</button></div></div></div></section>

    <section className="panel preview-panel"><div className="panel-header preview-header"><div><p className="eyebrow small">Step 2</p><h2>貼上報告並生成圖卡版</h2><p className="muted">貼上 GPT 完整報告後，系統會自動解析欄位並生成圖卡式報告。</p></div><div className="toolbar"><button className="btn" onClick={copyReport} disabled={!hasReport}>複製全文</button><button className="btn primary" onClick={printPdf} disabled={!hasReport}>PDF</button><button className="btn locked" onClick={requestWord}>Word</button></div></div><div className="paste-area no-print"><label className="field"><span>貼上 GPT 產出的完整土地評估報告</span><textarea rows={10} value={form.reportText} onChange={(e) => update('reportText', e.target.value)} placeholder="請把海悅土地評估調研助手產出的完整報告貼在這裡。" /></label></div><div className="report-tabs no-print"><button className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')}>圖卡版</button><button className={viewMode === 'raw' ? 'active' : ''} onClick={() => setViewMode('raw')}>原文版</button></div>{hasReport ? (viewMode === 'card' ? <CardReport report={structuredReport} /> : <article className="report-paper raw-paper"><div className="report-brand-row"><div className="report-brand-title">HIYES｜原文版</div></div><pre className="text-report">{form.reportText}</pre><div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div></article>) : <article className="report-paper"><pre className="text-report">尚未貼上土地評估報告。\n\n請先輸入配合業主、調研日期與目標地號，點擊「自動調研」。調研完成後，請複製 GPT 產出的完整報告並貼回本頁。</pre><div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div></article>}</section></section>

    <footer className="designer-credit"><span>Designed by</span><strong>海悅機構｜海宇國際 戴異軒 製</strong></footer>
  </main>;
}
