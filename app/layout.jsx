import './globals.css';
import './print-fix.css';
import './owner-briefing-final.css';

export const metadata = {
  title: '海悅廣告｜土地評估系統',
  description: '新版兩層架構：內部調研邏輯與業主版土地評估報告',
};

const ownerReportSanitizer = `
(function () {
  function textOf(el) { return (el && el.textContent ? el.textContent : '').replace(/\\s+/g, ' ').trim(); }
  function includesAny(text, words) { return words.some(function (w) { return text.indexOf(w) !== -1; }); }
  function remove(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

  var forbidden = [
    '代銷判斷','代銷處理方式','學區銷售權重','學區權重','主力訴求','輔助訴求','基本配備','不宜主打',
    '建議表價','首波成交帶','高樓層拉價空間','內部價格策略','debug','placeholder','暫無資料',
    '競案資料十一','競案資料十二','競案資料十三','系統操作流程','複製指令','啟動調研','檢查／載入回傳','檢查 / 載入回傳'
  ];
  var lawForbidden = ['可建築面積','法定容積','樓地板面積','法定容積樓地板面積','初步規劃方向','初步可規劃方向','對產品與總價的影響','對代銷規劃的影響','內部量體試算'];
  var lawAllowed = ['土地使用分區','建蔽率','容積率'];
  var roadForbidden = ['出入口判斷','整體判斷','加價面','抗性面','待確認事項','出口／車道／次要說明'];
  var compForbidden = ['A級競案判斷','區域成交帶','本案合理成交帶'];
  var priceForbidden = ['判斷理由','價格判斷','總價帶','建議表價','首波成交帶','高樓層拉價空間','內部價格策略','產品坪數推估'];

  function sanitizeReport() {
    var report = document.querySelector('.card-report.readable-report.briefing-report');
    if (!report) return;
    report.id = 'report-export-area';

    document.querySelectorAll('.hero-panel,.input-panel,.preview-header,.paste-area,.report-tabs,.designer-credit').forEach(function (el) {
      el.classList.add('no-print','system-panel');
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
      comp.querySelectorAll('.brief-data-card,.brief-kv,.brief-body-text').forEach(function (el) {
        var t = textOf(el);
        if (!t || includesAny(t, compForbidden) || includesAny(t, forbidden)) remove(el);
        else if (el.classList.contains('brief-data-card')) el.classList.add('competition-card');
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

    var conclusion = report.querySelector('.section-12, .section-14');
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
