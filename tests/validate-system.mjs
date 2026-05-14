import { readFileSync } from 'node:fs';

const page = readFileSync('app/page.jsx', 'utf8');
const ownerCss = readFileSync('app/owner-briefing-final.css', 'utf8');
const layout = readFileSync('app/layout.jsx', 'utf8');
const submitApi = readFileSync('app/api/reports/route.js', 'utf8');

const checks = [
  {
    name: 'Prompt requires summary JSON',
    pass: page.includes('summary JSON') && page.includes('summary.location') && page.includes('summary.price'),
  },
  {
    name: 'Prompt limits report to 01-12 owner briefing',
    pass: page.includes('01｜案件摘要') && page.includes('12｜結論') && page.includes('不要輸出風險分級'),
  },
  {
    name: 'Report ID is hidden from visible input UI',
    pass: !page.includes('回傳編號 report_id') && page.includes('回傳狀態'),
  },
  {
    name: 'Frontend prioritizes summary object before text parsing',
    pass: page.includes('sourceSummary') && page.includes('form?.summary') && page.includes('getSummary'),
  },
  {
    name: 'Manual JSON fallback exists',
    pass: layout.includes('tryParseManualPayload') && layout.includes('report_text') && layout.includes('summary') && layout.includes('localStorage'),
  },
  {
    name: 'Owner output uses 01-12 only',
    pass: layout.includes("var ORDER = ['02','03','04','05','06','07','08','09','10','11','12']") && !layout.includes("'14':'"),
  },
  {
    name: 'Owner report renderer rebuilds stable DOM from report text',
    pass: layout.includes('rebuildOwnerReport') && layout.includes('parseSections') && layout.includes('renderSection'),
  },
  {
    name: 'Competition renderer is specialized',
    pass: layout.includes('renderCases') && layout.includes('competition-card') && layout.includes('市場行情總結') && layout.includes('競案資料卡'),
  },
  {
    name: 'Price renderer always outputs fixed price cards',
    pass: layout.includes('renderPrice') && layout.includes('二樓以上住宅') && layout.includes('坡道平面車位') && layout.includes("block = [item[0] + '：待複核']"),
  },
  {
    name: 'Product renderer outputs fixed product cards',
    pass: layout.includes('renderProduct') && layout.includes('兩房產品') && layout.includes('三房產品') && layout.includes('不建議產品'),
  },
  {
    name: 'SWOT renderer prevents chapter 11 from disappearing',
    pass: layout.includes('renderSwot') && layout.includes('advantage-card') && layout.includes('resistance-card'),
  },
  {
    name: 'Print keeps browser header/footer strategy',
    pass: ownerCss.includes('@page') && ownerCss.includes('margin: 12mm 10mm 14mm') && !ownerCss.includes('visibility: hidden'),
  },
  {
    name: 'Print hides operation UI panels',
    pass: ownerCss.includes('.hero-panel') && ownerCss.includes('.input-panel') && ownerCss.includes('.paste-area') && ownerCss.includes('display: none !important'),
  },
  {
    name: 'Reading hierarchy CSS exists in owner stylesheet',
    pass: ownerCss.includes('.briefing-section') && ownerCss.includes('.brief-data-card') && ownerCss.includes('.brief-kv.priority-high'),
  },
  {
    name: 'Print CSS prevents card splitting',
    pass: ownerCss.includes('break-inside: avoid') && ownerCss.includes('page-break-inside: avoid'),
  },
  {
    name: 'Conclusion starts on independent page',
    pass: ownerCss.includes('.section-12') && ownerCss.includes('break-before: page'),
  },
  {
    name: 'Price grid exists',
    pass: ownerCss.includes('.price-grid') && ownerCss.includes('repeat(3'),
  },
  {
    name: 'Case grid exists',
    pass: ownerCss.includes('.case-grid') && ownerCss.includes('competition-card'),
  },
  {
    name: 'submitReport API accepts summary and falls back for old schema',
    pass: submitApi.includes('normalizeSummary') && submitApi.includes('looksLikeMissingSummaryColumn') && submitApi.includes('basePayload'),
  },
  {
    name: 'submitReport accepts snake_case and camelCase payloads',
    pass: submitApi.includes('body.report_id') && submitApi.includes('body.reportId') && submitApi.includes('body.report_text') && submitApi.includes('body.reportText'),
  },
  {
    name: 'submitReport mapping is preserved',
    pass: ['report_id', 'client', 'land_number', 'research_date', 'report_text', 'summary'].every((key) => submitApi.includes(key)),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
}

if (failed.length) {
  console.error(`\n${failed.length} validation check(s) failed.`);
  process.exit(1);
}

console.log('\nAll system validation checks passed.');
