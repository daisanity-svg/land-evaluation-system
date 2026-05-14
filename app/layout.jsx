import './globals.css';
import './print-fix.css';
import './owner-briefing-final.css';

export const metadata = {
  title: '海悅廣告｜土地評估系統',
  description: '新版兩層架構：內部調研邏輯與業主版土地評估報告',
};

const ownerReportSanitizer = String.raw`
(function () {
  var STORAGE_KEY = 'hiyes-land-evaluation-draft-v9-reading-mode';
  var manualImportLock = false;
  var SECTION_TITLES = {
    '01':'案件摘要','02':'基地基本條件','03':'法規與量體初判','04':'臨路條件與基地四向現況','05':'生活圈與市場定位','06':'學區與里別','07':'目標客群判斷','08':'競案分級與市場行情','09':'價格預判','10':'產品規劃建議','11':'銷售優勢與抗性','12':'結論'
  };
  var ORDER = ['02','03','04','05','06','07','08','09','10','11','12'];

  function cleanText(v) { return String(v || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); }
  function compact(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function el(tag, cls, text) { var node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; }
  function strip(line) { return String(line || '').replace(/^\s*#{1,6}\s*/, '').replace(/^\s*[-*]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').replace(/^\s*(主標|次標|說明)\s*[：:]\s*/, '').replace(/代銷結論/g, '結論').trim(); }
  function splitKV(line) { var s = String(line || ''); var idx = s.indexOf('：'); if (idx < 1) idx = s.indexOf(':'); if (idx < 1) return null; return [strip(s.slice(0, idx)), strip(s.slice(idx + 1))]; }
  function hasAny(text, list) { return list.some(function (word) { return text.indexOf(word) !== -1; }); }

  function readStoredDraft() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function normalizeSummary(summary) {
    if (!isObj(summary)) return null;
    return {
      location: compact(summary.location),
      land_number: compact(summary.land_number || summary.landNumber),
      zoning: compact(summary.zoning || summary.zone),
      area: compact(summary.area),
      road: compact(summary.road || summary.road_frontage),
      price: compact(summary.price || summary.suggested_price),
      product: compact(summary.product || summary.product_recommendation),
      conclusion: compact(summary.conclusion)
    };
  }

  function tryParseManualPayload(raw) {
    var text = cleanText(raw);
    if (!text || text.charAt(0) !== '{') return null;
    try {
      var parsed = JSON.parse(text);
      var payload = isObj(parsed && parsed.data) ? parsed.data : parsed;
      if (!isObj(payload)) return null;
      var reportText = cleanText(payload.report_text || payload.reportText);
      var summary = normalizeSummary(payload.summary);
      if (!reportText && !summary) return null;
      return {
        reportId: compact(payload.report_id || payload.reportId),
        client: compact(payload.client),
        landNumber: compact(payload.land_number || payload.landNumber),
        researchDate: compact(payload.research_date || payload.researchDate),
        summary: summary,
        reportText: reportText
      };
    } catch (e) { return null; }
  }

  function importManualPayload(payload) {
    if (!payload || manualImportLock) return;
    manualImportLock = true;
    var stored = readStoredDraft();
    var currentForm = stored.form || {};
    var nextForm = Object.assign({}, currentForm, {
      client: payload.client || currentForm.client || '',
      researchDate: payload.researchDate || currentForm.researchDate || new Date().toISOString().slice(0, 10),
      landNumber: payload.landNumber || currentForm.landNumber || '',
      reportText: payload.reportText || currentForm.reportText || '',
      summary: payload.summary || currentForm.summary || null
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, stored, {
      form: nextForm,
      reportId: payload.reportId || stored.reportId || '',
      waiting: false,
      syncMessage: '已解析手動回填 JSON，並生成業主閱讀版報告。'
    })));
    window.setTimeout(function () { window.location.reload(); }, 80);
  }

  function installManualJsonImport() {
    var textarea = document.querySelector('.paste-area textarea');
    if (!textarea || textarea.dataset.manualJsonImport === 'enabled') return;
    textarea.dataset.manualJsonImport = 'enabled';
    textarea.addEventListener('input', function () {
      var payload = tryParseManualPayload(textarea.value);
      if (payload) importManualPayload(payload);
    });
    textarea.addEventListener('paste', function () {
      window.setTimeout(function () {
        var payload = tryParseManualPayload(textarea.value);
        if (payload) importManualPayload(payload);
      }, 0);
    });
  }

  function parseSections(reportText) {
    var src = cleanText(reportText);
    var re = /^\s*(?:#{1,6}\s*)?(\d{1,2})\s*[｜|]\s*([^\n]+)\s*$/gm;
    var matches = [];
    var m;
    while ((m = re.exec(src))) matches.push(m);
    if (!matches.length) return [];
    return matches.map(function (match, i) {
      var id = String(match[1]).padStart(2, '0');
      if (id === '14') id = '12';
      return {
        id: id,
        title: SECTION_TITLES[id] || strip(match[2]),
        body: src.slice(match.index + match[0].length, i + 1 < matches.length ? matches[i + 1].index : src.length).trim()
      };
    }).filter(function (section) {
      var t = section.title || '';
      return ORDER.indexOf(section.id) !== -1 && !/風險|資料來源|複核|待補/.test(t);
    });
  }

  function lineList(text) {
    return cleanText(text).split('\n').map(strip).filter(Boolean).filter(function (line) {
      return !/代銷判斷|代銷處理方式|學區銷售權重|建議表價|首波成交帶|高樓層拉價空間|內部價格策略|價格可信度|可建築面積|法定容積樓地板面積|法定容積|樓地板面積|暫無資料|placeholder|debug|prompt|JSON/.test(line);
    });
  }

  function heading(index, title, subtitle) {
    var wrap = el('div', 'section-heading briefing-heading');
    wrap.appendChild(el('span', '', index || ''));
    var box = el('div');
    box.appendChild(el('h2', '', title));
    if (subtitle) box.appendChild(el('p', '', subtitle));
    wrap.appendChild(box);
    return wrap;
  }

  function kv(label, value) {
    if (!label || !value) return null;
    var node = el('div', 'brief-kv');
    node.appendChild(el('div', 'brief-kv-label', label));
    node.appendChild(el('div', 'brief-kv-value', value));
    return node;
  }

  function paragraph(text) { return el('p', 'brief-body-text', text); }

  function tableFromRows(rows) {
    if (!rows || !rows.length) return null;
    var wrap = el('div', 'brief-table-wrap');
    var table = el('table', 'brief-table');
    var tbody = document.createElement('tbody');
    rows.forEach(function (row, i) {
      var tr = document.createElement('tr');
      row.split('|').filter(Boolean).forEach(function (cell) {
        tr.appendChild(el('td', i === 0 ? 'table-head-cell' : '', strip(cell)));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function renderGeneric(body) {
    var box = el('div', 'brief-rich-text');
    var pendingTable = [];
    function flush() { if (pendingTable.length) { box.appendChild(tableFromRows(pendingTable)); pendingTable = []; } }
    lineList(body).forEach(function (line) {
      if (line.indexOf('|') !== -1 && line.split('|').length >= 3) { pendingTable.push(line); return; }
      flush();
      var pair = splitKV(line);
      if (pair && pair[0].length <= 18) box.appendChild(kv(pair[0], pair[1]));
      else if (/^([一二三四五六七八九十]+、|\d+[、.])/.test(line)) box.appendChild(el('h3', 'brief-subtitle', line));
      else box.appendChild(paragraph(line));
    });
    flush();
    return box;
  }

  function renderBase(body) {
    var box = el('div', 'brief-rich-text');
    var lines = lineList(body);
    var tableRows = lines.filter(function (line) { return line.indexOf('|') !== -1 && line.split('|').length >= 3; });
    if (tableRows.length) box.appendChild(tableFromRows(tableRows));
    lines.filter(function (line) { return tableRows.indexOf(line) === -1; }).forEach(function (line) {
      var pair = splitKV(line);
      if (pair && pair[0].length <= 18) box.appendChild(kv(pair[0], pair[1])); else box.appendChild(paragraph(line));
    });
    return box;
  }

  function dataCard(lines, type, index, titleFallback) {
    var clean = lines.map(strip).filter(Boolean);
    if (!clean.length) return null;
    var text = clean.join(' ');
    if (/^競案資料卡[一二三四五六七八九十0-9]*$/.test(text)) return null;
    var card = el('div', 'brief-data-card ' + type);
    card.appendChild(el('div', 'brief-card-eyebrow', type.indexOf('case') !== -1 ? '競案 ' + index : type.indexOf('price') !== -1 ? '價格重點' : type.indexOf('product') !== -1 ? '產品建議' : type.indexOf('swot') !== -1 ? '銷售判斷' : '重點資料'));
    var titleLine = clean.find(function (l) { return /^案名[:：]/.test(l); }) || clean.find(function (l) { return /二樓以上住宅|店面|坡道平面|兩房|三房|不建議|優勢|抗性/.test(l); }) || clean[0] || titleFallback;
    var titlePair = splitKV(titleLine);
    card.appendChild(el('h4', '', titlePair ? (titlePair[1] || titlePair[0]) : titleLine));
    var content = el('div', 'brief-card-content');
    clean.forEach(function (line) {
      if (/^競案資料卡/.test(line)) return;
      var pair = splitKV(line);
      if (pair) content.appendChild(kv(pair[0], pair[1])); else content.appendChild(paragraph(line));
    });
    card.appendChild(content);
    return card;
  }

  function splitByStarters(lines, starters) {
    var blocks = [];
    var current = [];
    lines.forEach(function (line) {
      var starts = starters.some(function (s) { return line.indexOf(s) === 0; });
      if (starts && current.length) { blocks.push(current); current = [line]; } else current.push(line);
    });
    if (current.length) blocks.push(current);
    return blocks;
  }

  function renderCases(body) {
    var box = el('div', 'brief-card-grid case-grid');
    var lines = lineList(body).filter(function (line) { return !/^競案資料卡/.test(line) && !/本次競案依|以下每案/.test(line); });
    var summaryLines = [];
    var caseLines = [];
    var inSummary = false;
    lines.forEach(function (line) {
      if (line.indexOf('市場行情總結') !== -1 || line.indexOf('區域成交帶') !== -1 || line.indexOf('本案合理成交帶') !== -1) inSummary = true;
      if (inSummary) summaryLines.push(line); else caseLines.push(line);
    });
    var blocks = splitByStarters(caseLines, ['競案一｜','競案二｜','競案三｜','競案四｜','競案五｜','案名：','案名:']);
    if (blocks.length <= 1) blocks = splitByStarters(caseLines, ['競案等級：','競案等級:']);
    var count = 0;
    blocks.forEach(function (block) {
      var text = block.join(' ');
      var hasCaseFields = hasAny(text, ['案名','案子規劃','屋齡','成交價格','成交筆數','參考價值','競案等級']);
      var onlyIntro = /市場參考價值分為|以下每案|資料卡呈現/.test(text);
      if (!hasCaseFields || onlyIntro || text.length < 45) return;
      count += 1;
      var card = dataCard(block, 'case competition-card', count, '競案');
      if (card) box.appendChild(card);
    });
    if (summaryLines.length) {
      var summary = dataCard(summaryLines, 'case competition-card market-summary-card', count + 1, '市場行情總結');
      if (summary) box.appendChild(summary);
    }
    if (!box.children.length) box.appendChild(paragraph('本章競案資料格式不足，請回原文確認競案資訊。'));
    return box;
  }

  function extractBlock(lines, starts, stops) {
    var start = lines.findIndex(function (line) { return starts.some(function (s) { return line.indexOf(s) === 0; }); });
    if (start < 0) return [];
    var out = [lines[start]];
    for (var i = start + 1; i < lines.length; i++) {
      if (stops.some(function (s) { return lines[i].indexOf(s) === 0; })) break;
      out.push(lines[i]);
    }
    return out;
  }

  function renderPrice(body) {
    var lines = lineList(body).filter(function (line) { return !/建議表價|首波成交帶|高樓層拉價空間|價格可信度|總價帶推估|人流動線判斷|區域接受度|本案價格建議/.test(line); });
    var box = el('div', 'brief-card-grid price-grid');
    var stops = ['二樓以上住宅','住宅','店面','坡道平面車位','坡道平面','車位','價格判斷摘要'];
    [
      ['二樓以上住宅', ['二樓以上住宅','住宅']],
      ['店面', ['店面']],
      ['坡道平面車位', ['坡道平面車位','坡道平面','車位']]
    ].forEach(function (item, idx) {
      var block = extractBlock(lines, item[1], stops);
      if (!block.length) block = [item[0] + '：待複核'];
      var card = dataCard(block, 'price price-card', idx + 1, item[0]);
      if (card) box.appendChild(card);
    });
    var summary = extractBlock(lines, ['價格判斷摘要'], stops);
    if (summary.length) {
      var card = dataCard(summary, 'price price-card', 4, '價格判斷摘要');
      if (card) box.appendChild(card);
    }
    return box;
  }

  function renderProduct(body) {
    var lines = lineList(body).filter(function (line) { return !/2\+1房|2＋1房|彈性房|四房|店面產品/.test(line); });
    var box = el('div', 'brief-card-grid product-grid');
    var stops = ['兩房產品','兩房','三房產品','三房','不建議產品','不建議'];
    [['兩房產品',['兩房產品','兩房']], ['三房產品',['三房產品','三房']], ['不建議產品',['不建議產品','不建議']]].forEach(function (item, idx) {
      var block = extractBlock(lines, item[1], stops);
      if (!block.length && idx < 2) block = [item[0] + '：待複核'];
      if (block.length) {
        var card = dataCard(block, 'product product-card', idx + 1, item[0]);
        if (card) box.appendChild(card);
      }
    });
    return box;
  }

  function renderSwot(body) {
    var lines = lineList(body).filter(function (line) { return !/代銷處理方式|代銷判斷/.test(line); });
    var box = el('div', 'brief-card-grid swot-brief-grid');
    var blocks = splitByStarters(lines, ['銷售優勢','優勢一','優勢二','優勢三','1.','2.','3.','銷售抗性','抗性一','抗性二','抗性三']);
    var count = 0;
    blocks.forEach(function (block) {
      var text = block.join(' ');
      if (text.length < 12) return;
      count += 1;
      var type = /抗性|劣勢|風險/.test(text) ? 'swot resistance-card' : 'swot advantage-card';
      var card = dataCard(block, type, count, '銷售判斷');
      if (card) box.appendChild(card);
    });
    if (!box.children.length) box.appendChild(renderGeneric(body));
    return box;
  }

  function renderSection(section) {
    var wrapper = el('section', 'info-card accent briefing-section section-' + section.id);
    wrapper.appendChild(heading(section.id, section.title));
    if (section.id === '02') wrapper.appendChild(renderBase(section.body));
    else if (section.id === '08') wrapper.appendChild(renderCases(section.body));
    else if (section.id === '09') wrapper.appendChild(renderPrice(section.body));
    else if (section.id === '10') wrapper.appendChild(renderProduct(section.body));
    else if (section.id === '11') wrapper.appendChild(renderSwot(section.body));
    else wrapper.appendChild(renderGeneric(section.body));
    if (section.id === '12') wrapper.classList.add('conclusion-section', 'conclusion-card');
    return wrapper;
  }

  function metric(label, value) {
    var card = el('div', 'metric-card');
    card.appendChild(el('small', '', label));
    card.appendChild(el('strong', '', value || '依公開資料初判／待複核'));
    return card;
  }

  function rebuildOwnerReport() {
    installManualJsonImport();
    var stored = readStoredDraft();
    var form = stored.form || {};
    var reportText = cleanText(form.reportText || '');
    if (!reportText) return;
    var target = document.querySelector('.card-report.readable-report.briefing-report');
    if (!target) return;
    var hash = String(reportText.length) + ':' + reportText.slice(0, 80) + ':v3';
    if (target.dataset.ownerRebuilt === hash) return;
    target.dataset.ownerRebuilt = hash;
    target.id = 'report-export-area';
    target.innerHTML = '';

    var brand = el('div', 'report-brand-row');
    var lockup = el('div', 'report-brand-lockup');
    lockup.appendChild(el('div', 'report-brand-mark', 'H'));
    var brandCopy = el('div');
    brandCopy.appendChild(el('div', 'report-brand-title', 'HIYES'));
    brandCopy.appendChild(el('div', 'report-brand-subtitle', '海悅廣告｜土地評估系統'));
    lockup.appendChild(brandCopy);
    brand.appendChild(lockup);
    var side = el('div', 'report-brand-side');
    side.appendChild(el('span', '', '土地開發初評'));
    side.appendChild(el('span', '', 'OWNER REPORT'));
    brand.appendChild(side);
    target.appendChild(brand);

    var summary = normalizeSummary(form.summary) || {};
    var summarySection = el('section', 'report-section cover-section briefing-summary');
    summarySection.appendChild(heading('01', '案件摘要'));
    var grid = el('div', 'summary-grid briefing-summary-grid');
    [
      ['標的位置', summary.location], ['標的地號', summary.land_number || form.landNumber], ['土地分區', summary.zoning], ['基地面積', summary.area],
      ['臨路條件', summary.road], ['建議價格', summary.price], ['建議產品', summary.product], ['結論', summary.conclusion]
    ].forEach(function (row) { grid.appendChild(metric(row[0], row[1])); });
    summarySection.appendChild(grid);
    target.appendChild(summarySection);

    var main = el('section', 'report-section briefing-main');
    main.appendChild(heading('', (form.client || '建設公司') + '－土地評估', '案件簡報'));
    var sections = parseSections(reportText);
    var byId = {};
    sections.forEach(function (s) { if (!byId[s.id]) byId[s.id] = s; });
    ORDER.forEach(function (id) {
      var section = byId[id] || { id: id, title: SECTION_TITLES[id], body: '' };
      if (id === '09' || id === '10' || id === '11' || byId[id]) main.appendChild(renderSection(section));
    });
    target.appendChild(main);
  }

  function sanitizeOuterUi() {
    document.querySelectorAll('.hero-panel,.input-panel,.preview-header,.paste-area,.report-tabs,.designer-credit,.sync-box,.action-card,.fallback-link,textarea,button').forEach(function (node) {
      node.classList.add('no-print', 'system-panel');
    });
  }

  function run() { sanitizeOuterUi(); rebuildOwnerReport(); }
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('beforeprint', run);
  var mo = new MutationObserver(function () { window.requestAnimationFrame(run); });
  document.addEventListener('DOMContentLoaded', function () { mo.observe(document.body, { childList: true, subtree: true }); });
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: ownerReportSanitizer }} />
      </body>
    </html>
  );
}
