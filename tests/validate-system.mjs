import { readFileSync } from 'node:fs';

const page = readFileSync('app/page.jsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');
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
    name: 'Briefing hides risk/source sections from owner report',
    pass: page.includes('isHiddenOwnerSection') && page.includes("title.includes('風險')") && page.includes("title.includes('資料來源')"),
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
    name: 'Reading hierarchy CSS exists',
    pass: css.includes('.briefing-section') && css.includes('.brief-data-card') && css.includes('.brief-kv.priority-high'),
  },
  {
    name: 'Print CSS prevents card splitting',
    pass: css.includes('break-inside:avoid') && css.includes('page-break-inside:avoid'),
  },
  {
    name: 'submitReport API accepts summary and falls back for old schema',
    pass: submitApi.includes('normalizeSummary') && submitApi.includes('looksLikeMissingSummaryColumn') && submitApi.includes('basePayload'),
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
