import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routes = [
  'app/api/diagnostics/action-submit/route.js',
  'app/api/diagnostics/full/route.js',
  'app/api/diagnostics/submit-report/route.js',
  'app/api/_diagnostics/submit-report/route.js',
];

const originalFetch = global.fetch;
let fetchCalled = false;
global.fetch = async () => {
  fetchCalled = true;
  throw new Error('Retired diagnostics must not call external services.');
};

try {
  for (const routePath of routes) {
    const source = await readFile(routePath, 'utf8');
    assert.doesNotMatch(source, /submitReportPost|reportsPost|gptSubmitPost|buildLandEvaluationExcelBuffer/);

    const { GET } = await import(`../${routePath}?test=${Date.now()}-${routePath}`);
    const response = await GET();
    const body = await response.json();

    assert.equal(response.status, 410, `${routePath} must return HTTP 410`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(body, {
      success: false,
      saved: false,
      verified: false,
      status: 'retired',
      error: 'This write-capable diagnostic endpoint has been disabled.',
    });
  }

  assert.equal(fetchCalled, false, 'retired diagnostics must have no network or database side effects');
  console.log('Retired diagnostic endpoint checks passed.');
} finally {
  global.fetch = originalFetch;
}
