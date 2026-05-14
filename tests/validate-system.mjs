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
    name: 'Briefing hides risk/source sections from owner report',
    pass: page.includes('isHiddenOwnerSection') && page.includes("title.includes('風險')") && page.includes("title.includes('資料來源')"),
  },
  {
    name: 'Owner sanitizer removes internal-only labels',
    pass: layout.includes('代銷判斷') && layout.includes('學區銷售權重') && layout.includes('內部價格策略') && layout.includes('可建築面積'),
  },
  {
    name: 'Chapter 14 is normalized or removed from owner report',
    pass: layout.includes('section-14') && layout.includes('section-12') && layout.includes('結論'),
  },
  {
    name: 'Competitor section renders as data cards',
    pass: page.includes("sectionId==='08'") && page.includes('競案資料卡') && page.includes('case-grid'),
  },
  {
    name: 'Pricing section renders as price cards',
    pass: page.includes("sectionId==='09'") && page.includes('price-grid') && page.includes('二樓以上住宅'),
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
    name: 'PDF only prints report export area',
    pass: ownerCss.includes('#report-export-area') && ownerCss.includes('body *') && ownerCss.includes('visibility: hidden'),
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
