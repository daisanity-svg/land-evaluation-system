import { readFileSync } from 'node:fs';

const page = readFileSync('app/page.jsx', 'utf8');
const ownerCss = readFileSync('app/owner-briefing-final.css', 'utf8');
const globalCss = readFileSync('app/globals.css', 'utf8');
const layout = readFileSync('app/layout.jsx', 'utf8');
const pasteNormalizer = readFileSync('public/report-paste-normalize.js', 'utf8');
const priceAdjust = readFileSync('public/hiyes-price-adjust.js', 'utf8');
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
    name: 'Manual paste fallback normalizes Action JSON',
    pass: layout.includes('/report-paste-normalize.js')
      && pasteNormalizer.includes('JSON.parse')
      && pasteNormalizer.includes('report_text')
      && pasteNormalizer.includes('reportText')
      && page.includes('localStorage'),
  },
  {
    name: 'Owner output contract is 01-12 with legacy conclusion compatibility',
    pass: page.includes('const SECTIONS =')
      && page.includes("'01｜案件摘要'")
      && page.includes("'12｜結論'")
      && page.includes("section?.id === '13'")
      && page.includes("p.id==='14'")
      && page.includes("title:'結論'"),
  },
  {
    name: 'Owner report renderer builds stable cards from report text',
    pass: page.includes('function parseSections')
      && page.includes('function orderSections')
      && page.includes('function Report')
      && page.includes('parts.map'),
  },
  {
    name: 'Competition renderer is specialized',
    pass: page.includes("sectionId==='08'")
      && page.includes('splitCardsByKeywords')
      && page.includes('type="case"')
      && page.includes('競案資料卡')
      && ownerCss.includes('.competition-card'),
  },
  {
    name: 'Price renderer and manual adjustment preserve fixed categories',
    pass: page.includes("sectionId==='09'")
      && page.includes('二樓以上住宅')
      && page.includes('坡道平面')
      && priceAdjust.includes("['二樓以上住宅','二樓以上住宅','residential']")
      && priceAdjust.includes("['坡道平面車位','坡道平面車位','parking']"),
  },
  {
    name: 'Product contract remains limited to two-room and three-room plans',
    pass: page.includes('產品只寫兩房、三房')
      && priceAdjust.includes('data-product-field="twoRoomMin"')
      && priceAdjust.includes('data-product-field="threeRoomMin"')
      && layout.includes('/hiyes-price-adjust.js'),
  },
  {
    name: 'SWOT renderer prevents chapter 11 from disappearing',
    pass: page.includes("sectionId==='11'")
      && page.includes('swot-brief-grid')
      && page.includes("'優勢一'")
      && page.includes("'抗性一'"),
  },
  {
    name: 'Print keeps browser header/footer strategy',
    pass: ownerCss.includes('@page') && ownerCss.includes('margin: 12mm 10mm 14mm') && !ownerCss.includes('visibility: hidden'),
  },
  {
    name: 'Print hides operation UI panels',
    pass: globalCss.includes('.hero-panel')
      && globalCss.includes('.input-panel')
      && globalCss.includes('.paste-area')
      && globalCss.includes('display:none!important'),
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
    name: 'submitReport API requires and verifies summary',
    pass: submitApi.includes('normalizeSummary') && submitApi.includes('invalid_summary') && submitApi.includes('completeAndMatching'),
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
