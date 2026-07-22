import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/page.jsx', 'utf8');

assert.match(page, /HANDOFF_SESSION_KEY = 'hiyes-approved-research-handoff-v1'/);
assert.match(page, /function readApprovedResearch\(\)/);
assert.match(page, /function approvedResearchState\(form\)/);
assert.match(page, /已驗收研究交接包/);
assert.match(page, /needs_manual_review、衝突、待複核或空值不得改寫成既定事實/);
assert.match(page, /不得產出正式報告、不得呼叫 submitReport/);
assert.match(page, /sessionStorage\.getItem\(HANDOFF_SESSION_KEY\)/);
assert.match(page, /業主、調研日期或目標地號與已驗收研究交接包不一致/);
assert.match(page, /案件安全閘已阻擋本次操作/);
assert.doesNotMatch(page, /fetch\('\/api\/research\/handoff'/);

console.log('Approved research handoff prompt bridge checks passed.');
