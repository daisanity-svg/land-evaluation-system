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
    'debug','placeholder','暫無資料','競案資料十一','競案資料十二','競案資料十三','系統操作流程','複製指令',
    '啟動調研','檢查／載入回傳','檢查 / 載入回傳','prompt','Prompt','JSON','程式碼區塊'
  ];
  var lawForbidden = ['可建築面積','法定容積','樓地板面積','法定容積樓地板面積','初步規劃方向','初步可規劃方向','對產品與總價的影響','對代銷規劃的影響','內部量體試算'];
  var lawAllowed = ['土地使用分區','建蔽率','容積率'];
  var roadForbidden = ['待確認事項','出口／車道／次要說明'];
  var priceForbidden = ['判斷理由','價格判斷','總價帶推估','低樓層價格','高樓層價格','建議表價','首波成交帶','高樓層拉價空間','內部價格策略','價格可信度','產品坪數推估'];
  var productForbidden = ['2+1房','2＋1房','彈性房','四房','店面產品'];

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

    var comp = report.querySelector('.section-08');
    if (comp) {
      comp.querySelectorAll('.brief-data-card').forEach(function (el) {
        var t = textOf(el);
        if (!t || includesAny(t, ['競案資料十一','競案資料十二','競案資料十三','空白競案','暫無資料'])) remove(el);
        else el.classList.add('competition-card');
      });
    }

    var price = report.querySelector('.section-09');
    if (price) {
      price.querySelectorAll('.brief-data-card,.brief-kv,.brief-body-text').forEach(function (el) {
        var t = textOf(el);
        if (includesAny(t, priceForbidden)) remove(el);
        else if (el.classList.contains('brief-data-card')) el.classList.add('price-card');
      });
    }

    var product = report.querySelector('.section-10');
    if (product) {
      product.querySelectorAll('.brief-data-card,.brief-kv,.brief-body-text').forEach(function (el) {
        var t = textOf(el);
        if (includesAny(t, productForbidden)) remove(el);
        else if (el.classList.contains('brief-data-card')) el.classList.add('product-card');
      });
    }

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
