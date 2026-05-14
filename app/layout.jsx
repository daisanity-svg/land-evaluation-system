import './globals.css';
import './print-fix.css';
import './owner-briefing-final.css';

export const metadata = {
  title: '海悅廣告｜土地評估系統',
  description: '新版兩層架構：內部調研邏輯與業主版土地評估報告',
};

const ownerReportSanitizer = `
(function () {
  var STORAGE_KEY = 'hiyes-land-evaluation-draft-v9-reading-mode';
  var manualImportLock = false;

  function textOf(el) { return (el && el.textContent ? el.textContent : '').replace(/\\s+/g, ' ').trim(); }
  function includesAny(text, words) { return words.some(function (w) { return text.indexOf(w) !== -1; }); }
  function remove(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
  function normalizeValue(value) { return String(value || '').trim(); }
  function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function createEl(tag, className, text) { var el = document.createElement(tag); if (className) el.className = className; if (text != null) el.textContent = text; return el; }

  function normalizeSummary(summary) {
    if (!isObject(summary)) return null;
    return {
      location: normalizeValue(summary.location),
      land_number: normalizeValue(summary.land_number || summary.landNumber),
      zoning: normalizeValue(summary.zoning || summary.zone),
      area: normalizeValue(summary.area),
      road: normalizeValue(summary.road || summary.road_frontage),
      price: normalizeValue(summary.price || summary.suggested_price),
      product: normalizeValue(summary.product || summary.product_recommendation),
      conclusion: normalizeValue(summary.conclusion)
    };
  }

  function tryParseManualPayload(raw) {
    var text = normalizeValue(raw);
    if (!text || text.charAt(0) !== '{') return null;
    try {
      var parsed = JSON.parse(text);
      var payload = isObject(parsed && parsed.data) ? parsed.data : parsed;
      if (!isObject(payload)) return null;
      var reportText = normalizeValue(payload.report_text || payload.reportText);
      var summary = normalizeSummary(payload.summary);
      if (!reportText && !summary) return null;
      return {
        reportId: normalizeValue(payload.report_id || payload.reportId),
        client: normalizeValue(payload.client),
        landNumber: normalizeValue(payload.land_number || payload.landNumber),
        researchDate: normalizeValue(payload.research_date || payload.researchDate),
        summary: summary,
        reportText: reportText
      };
    } catch (error) {
      return null;
    }
  }

  function readStoredDraft() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch (error) { return {}; }
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
    var nextStored = Object.assign({}, stored, {
      form: nextForm,
      reportId: payload.reportId || stored.reportId || '',
      waiting: false,
      syncMessage: '已解析手動回填 JSON，並生成業主閱讀版報告。'
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
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

  var forbidden = [
    '代銷判斷','代銷處理方式','學區銷售權重','學區權重','主力訴求','輔助訴求','基本配備','不宜主打',
    '風險分級','資料來源','待補資料','複核清單','建議表價','首波成交帶','高樓層拉價空間','內部價格策略',
    'debug','placeholder','暫無資料','競案資料十一','競案資料十二','競案資料十三','競案資料十四','競案資料十五','競案資料十六','系統操作流程','複製指令',
    '啟動調研','檢查／載入回傳','檢查 / 載入回傳','prompt','Prompt','JSON','程式碼區塊'
  ];
  var lawForbidden = ['可建築面積','法定容積','樓地板面積','法定容積樓地板面積','初步規劃方向','初步可規劃方向','對產品與總價的影響','對代銷規劃的影響','內部量體試算'];
  var lawAllowed = ['土地使用分區','建蔽率','容積率'];
  var roadForbidden = ['待確認事項','出口／車道／次要說明'];
  var priceForbidden = ['判斷理由','價格判斷','總價帶推估','低樓層價格','高樓層價格','建議表價','首波成交帶','高樓層拉價空間','內部價格策略','價格可信度','產品坪數推估','人流動線判斷','區域接受度','本案價格建議'];
  var productForbidden = ['2+1房','2＋1房','彈性房','四房','店面產品'];

  function kvParts(kv) {
    return {
      label: textOf(kv.querySelector('.brief-kv-label')),
      value: textOf(kv.querySelector('.brief-kv-value'))
    };
  }

  function rebuildBaseLandTable(report) {
    var section = report.querySelector('.section-02');
    if (!section || section.dataset.tableRebuilt === 'done') return;
    var kvs = Array.from(section.querySelectorAll('.brief-kv'));
    if (kvs.length < 8) return;

    var rows = [];
    var current = null;
    kvs.forEach(function (kv) {
      var parts = kvParts(kv);
      if (!parts.label) return;
      if (parts.label.indexOf('地號') !== -1 && parts.label.indexOf('標的') === -1) {
        if (current && (current.land || current.m2 || current.ping || current.note)) rows.push(current);
        current = { land: parts.value, m2: '', ping: '', note: '' };
      } else if (current && parts.label.indexOf('面積㎡') !== -1) {
        current.m2 = parts.value;
      } else if (current && parts.label.indexOf('面積坪') !== -1) {
        current.ping = parts.value;
      } else if (current && parts.label.indexOf('備註') !== -1) {
        current.note = parts.value;
      }
    });
    if (current && (current.land || current.m2 || current.ping || current.note)) rows.push(current);
    rows = rows.filter(function (row) { return row.land && (row.m2 || row.ping); });
    if (!rows.length) return;

    var wrap = createEl('div', 'brief-table-wrap land-area-table');
    var table = createEl('table', 'brief-table');
    var tbody = document.createElement('tbody');
    var head = document.createElement('tr');
    ['地號','面積㎡','面積坪','備註'].forEach(function (label) {
      var td = createEl('td', 'table-head-cell', label);
      head.appendChild(td);
    });
    tbody.appendChild(head);
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      [row.land, row.m2, row.ping, row.note || ''].forEach(function (value) {
        tr.appendChild(createEl('td', '', value));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);

    var heading = section.querySelector('.section-heading');
    if (heading && heading.parentNode) heading.insertAdjacentElement('afterend', wrap);
    kvs.forEach(function (kv) {
      var label = kvParts(kv).label;
      if (includesAny(label, ['地號','面積㎡','面積坪','備註'])) remove(kv);
    });
    section.dataset.tableRebuilt = 'done';
  }

  function cleanCompetitionCards(report) {
    var comp = report.querySelector('.section-08');
    if (!comp) return;
    comp.querySelectorAll('.brief-data-card').forEach(function (card) {
      var t = textOf(card);
      var isPlaceholder = /^競案資料卡[一二三四五六七八九十百0-9]*$/.test(t) || /^競案[一二三四五六七八九十百0-9]*$/.test(t);
      var isBadNumbered = /競案資料(十一|十二|十三|十四|十五|十六|17|18|19|20)/.test(t);
      var hasRealCase = includesAny(t, ['案名','案子規劃','屋齡','成交價格','參考價值']) && t.length > 45;
      var hasMarketSummary = t.indexOf('市場行情總結') !== -1;
      if (!t || isPlaceholder || isBadNumbered || (!hasRealCase && !hasMarketSummary)) {
        remove(card);
        return;
      }
      card.classList.add('competition-card');
      var eyebrow = card.querySelector('.brief-card-eyebrow');
      if (eyebrow && eyebrow.textContent.indexOf('競案') === -1) eyebrow.textContent = '競案資料';
    });
  }

  function cleanPriceSection(report) {
    var price = report.querySelector('.section-09');
    if (!price) return;
    var allowed = ['二樓以上住宅','店面','坡道平面車位','坡道平面','車位','價格判斷摘要'];
    price.querySelectorAll('.brief-data-card').forEach(function (card) {
      var t = textOf(card);
      if (!includesAny(t, allowed) || includesAny(t, priceForbidden)) {
        remove(card);
        return;
      }
      card.classList.add('price-card');
    });
    price.querySelectorAll('.brief-kv,.brief-body-text').forEach(function (el) {
      var t = textOf(el);
      if (includesAny(t, priceForbidden)) remove(el);
    });
  }

  function cleanProductSection(report) {
    var product = report.querySelector('.section-10');
    if (!product) return;
    var allowed = ['兩房','三房','不建議產品','建議坪數','對應客群','總價控制','規劃理由'];
    product.querySelectorAll('.brief-data-card').forEach(function (card) {
      var t = textOf(card);
      if (includesAny(t, productForbidden) || !includesAny(t, allowed)) {
        remove(card);
        return;
      }
      card.classList.add('product-card');
    });
    product.querySelectorAll('.brief-kv,.brief-body-text').forEach(function (el) {
      var t = textOf(el);
      if (includesAny(t, productForbidden)) remove(el);
    });
  }

  function sanitizeReport() {
    installManualJsonImport();
    var report = document.querySelector('.card-report.readable-report.briefing-report');
    if (!report) return;
    report.id = 'report-export-area';

    document.querySelectorAll('.hero-panel,.input-panel,.preview-header,.paste-area,.report-tabs,.designer-credit,.sync-box,.action-card,.fallback-link,textarea,button').forEach(function (el) {
      el.classList.add('no-print','system-panel');
    });

    var section12 = report.querySelector('.section-12');
    var section14 = report.querySelector('.section-14');
    if (section14 && !section12) {
      section14.classList.remove('section-14');
      section14.classList.add('section-12');
      var number = section14.querySelector('.section-heading.briefing-heading > span');
      if (number) number.textContent = '12';
      var title = section14.querySelector('.section-heading.briefing-heading h2');
      if (title) title.textContent = '結論';
    } else if (section14) {
      remove(section14);
    }

    report.querySelectorAll('.section-13').forEach(remove);
    report.querySelectorAll('.briefing-section').forEach(function (section) {
      var title = textOf(section.querySelector('.section-heading'));
      if (includesAny(title, ['風險','資料來源','複核事項','待補資料'])) remove(section);
    });

    rebuildBaseLandTable(report);

    report.querySelectorAll('.brief-kv,.brief-body-text,.brief-data-card,.metric-card').forEach(function (el) {
      var t = textOf(el);
      if (!t || includesAny(t, forbidden)) remove(el);
    });

    var law = report.querySelector('.section-03');
    if (law) {
      law.querySelectorAll('.brief-kv,.brief-body-text,.brief-data-card').forEach(function (el) {
        var t = textOf(el);
        var isAllowed = includesAny(t, lawAllowed);
        var isBlocked = includesAny(t, lawForbidden);
        if (isBlocked || (!isAllowed && el.classList.contains('brief-kv'))) remove(el);
      });
    }

    var road = report.querySelector('.section-04');
    if (road) {
      road.querySelectorAll('.brief-kv,.brief-body-text,.brief-data-card').forEach(function (el) {
        if (includesAny(textOf(el), roadForbidden)) remove(el);
      });
    }

    var school = report.querySelector('.section-06');
    if (school) {
      school.querySelectorAll('.brief-kv,.brief-body-text,.brief-data-card').forEach(function (el) {
        if (includesAny(textOf(el), ['學區銷售權重','學區權重','主力訴求','輔助訴求','基本配備','不宜主打','代銷判斷'])) remove(el);
      });
    }

    cleanCompetitionCards(report);
    cleanPriceSection(report);
    cleanProductSection(report);

    var swot = report.querySelector('.section-11');
    if (swot) {
      swot.querySelectorAll('.brief-data-card,.brief-kv,.brief-body-text').forEach(function (el) {
        var t = textOf(el);
        if (includesAny(t, ['代銷處理方式','代銷判斷','內部操作建議欄位'])) remove(el);
        else if (el.classList.contains('brief-data-card')) {
          if (includesAny(t, ['抗性'])) el.classList.add('resistance-card');
          else el.classList.add('advantage-card');
        }
      });
    }

    var conclusion = report.querySelector('.section-12');
    if (conclusion) conclusion.classList.add('conclusion-section','conclusion-card');
  }

  document.addEventListener('DOMContentLoaded', sanitizeReport);
  window.addEventListener('load', sanitizeReport);
  window.addEventListener('beforeprint', sanitizeReport);
  var mo = new MutationObserver(function () { window.requestAnimationFrame(sanitizeReport); });
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
