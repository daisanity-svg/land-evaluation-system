import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/research-review/page.jsx', 'utf8');

assert.match(page, /fetch\('\/api\/research\/validate'/);
assert.match(page, /method: 'POST'/);
assert.match(page, /不會寫入報告、資料庫或正式系統/);
assert.match(page, /不會自動寫入任何正式報告/);
assert.match(page, /needs_manual_review/);
assert.match(page, /allow_formal_report/);
assert.match(page, /複製正式報告交接內容/);
assert.match(page, /fetch\('\/api\/research\/handoff'/);
assert.match(page, /sessionStorage\.setItem\(HANDOFF_SESSION_KEY/);
assert.match(page, /inputLandNumbers: researchPackage\.case\.input_land_numbers/);
assert.match(page, /帶入業主版報告/);
assert.doesNotMatch(page, /submitReport|supabase|api\/reports/);

console.log('Research review page contract checks passed.');
