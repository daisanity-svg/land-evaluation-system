import assert from 'node:assert/strict';
import { POST } from '../app/api/reports/route.js';
import { GET as getStatus } from '../app/api/reports/[reportId]/status/route.js';
import { GET as getOpenApi } from '../app/api/openapi/route.js';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret-test-key';

const base = {
  report_id: 'report-1', client: '和峻建設', land_number: '善捷段188、189地號', research_date: '2026-07-14',
  report_text: '01｜案件摘要\n完整報告', summary: { location: '桃園市龜山區', conclusion: '可評估' },
};
const row = (payload = base) => ({ ...payload, summary: { conclusion: '可評估', product: '', price: '', road: '', area: '', zoning: '', land_number: '', location: '桃園市龜山區' }, created_at: '2026-01-01', updated_at: '2026-01-02' });
const response = (body, status = 200) => new Response(body === null ? '' : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const request = (payload) => new Request('https://local/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });

async function run(name, mock, payload = base, expectedStatus = 200) {
  global.fetch = mock;
  const res = await POST(request(payload));
  const data = await res.json();
  assert.equal(res.status, expectedStatus, name);
  return data;
}

let calls = 0;
let data = await run('new report', async (_url, init = {}) => {
  calls += 1;
  if (init.method === 'POST') return response(null, 201);
  return calls === 1 ? response([]) : response([row()]);
}, base, 201);
assert.equal(data.operation, 'created'); assert.equal(data.verified, true);

data = await run('same report resubmitted', async (_url, init = {}) => init.method === 'POST' ? response(null, 200) : response([row()]));
assert.equal(data.operation, 'existing_verified');

const changed = { ...base, report_text: 'updated report' };
let reads = 0;
data = await run('existing report updated', async (_url, init = {}) => {
  if (init.method === 'POST') return response(null, 200);
  reads += 1; return response([row(reads === 1 ? base : changed)]);
}, changed);
assert.equal(data.operation, 'updated');

data = await run('missing report text', async () => { throw new Error('must not fetch'); }, { ...base, report_text: '' }, 400);
assert.equal(data.status, 'missing_required_fields');

data = await run('write failed', async (_url, init = {}) => init.method === 'POST' ? response({ message: 'write failed' }, 500) : response([]), base, 502);
assert.equal(data.saved, false);

data = await run('initial read failed', async () => response({ message: 'read failed' }, 500), base, 502);
assert.equal(data.status, 'supabase_read_failed');

data = await run('Supabase authentication failed', async () => response({ message: 'unauthorized' }, 401), base, 401);
assert.equal(data.saved, false);

reads = 0;
data = await run('verification failed', async (_url, init = {}) => {
  if (init.method === 'POST') return response(null, 200);
  reads += 1; return reads === 1 ? response([]) : response({ message: 'query failed' }, 500);
}, base, 502);
assert.equal(data.verified, false);

reads = 0;
data = await run('verification mismatch', async (_url, init = {}) => {
  if (init.method === 'POST') return response(null, 200);
  reads += 1;
  return reads === 1 ? response([]) : response([row({ ...base, report_text: 'different stored report' })]);
}, base, 502);
assert.equal(data.status, 'verification_mismatch');

data = await run('summary persists', async (_url, init = {}) => init.method === 'POST' ? response(null, 200) : response([row()]));
assert.equal(data.success, true);

data = await run('invalid summary', async () => { throw new Error('must not fetch'); }, { ...base, summary: 'bad' }, 400);
assert.equal(data.status, 'invalid_summary');

data = await run('secret redaction', async (_url, init = {}) => init.method === 'POST' ? response({ message: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }, 500) : response([]), base, 502);
assert.equal(JSON.stringify(data).includes(process.env.SUPABASE_SERVICE_ROLE_KEY), false);

const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
data = await run('missing Supabase configuration', async () => { throw new Error('must not fetch'); }, base, 500);
assert.equal(data.status, 'missing_config');
process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;

global.fetch = async () => response([row()]);
const statusRes = await getStatus(new Request('https://local'), { params: { reportId: base.report_id } });
const statusData = await statusRes.json();
assert.equal(statusData.exists, true); assert.equal('report_text' in statusData, false); assert.equal(statusData.report_text_length, base.report_text.length);

const specRes = await getOpenApi(); const spec = await specRes.json();
assert.equal(spec.paths['/api/reports'].post.operationId, 'submitReport');
assert.ok(spec.paths['/api/reports'].post.responses['400']);
assert.ok(spec.paths['/api/reports'].post.responses['500']);
assert.ok(spec.paths['/api/reports'].post.responses['502']);
assert.ok(spec.paths['/api/reports/{reportId}/status']);

console.log('All submitReport verification tests passed.');
