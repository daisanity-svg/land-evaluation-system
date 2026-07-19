import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/research-review/page.jsx', 'utf8');

assert.match(page, /fetch\('\/api\/research\/validate'/);
assert.match(page, /method: 'POST'/);
assert.match(page, /不會寫入報告、資料庫或正式系統/);
assert.match(page, /不會自動寫入任何正式報告/);
assert.match(page, /needs_manual_review/);
assert.doesNotMatch(page, /submitReport|supabase|api\/reports/);

console.log('Research review page contract checks passed.');
