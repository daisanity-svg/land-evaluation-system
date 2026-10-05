import assert from 'node:assert/strict';
import { POST } from '../app/api/reports/route.js';
import { GET as getStatus } from '../app/api/reports/[reportId]/status/route.js';
import { GET as getOpenApi } from '../app/api/openapi/route.js';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret-test-key';

const completeReportText = `01｜案件摘要
配合業主：和峻建設
調研日期：2026-07-14
目標地號：善捷段188、189地號
基地位置：桃園市龜山區
土地使用分區：住宅區
基地面積：100坪
建蔽率：60%
容積率：200%
臨路條件：臨主要道路
初步市場定位：自住市場
建議價格：30萬／坪
建議產品：兩房、三房
初步結論：可評估
本案快速結論：可行

02｜基地基本條件
地號｜面積㎡｜面積坪｜備註
善捷段188地號｜100｜30｜待複核

03｜法規與量體初判
土地使用分區：住宅區
建蔽率：60%
容積率：200%

04｜臨路條件與基地四向現況
臨路條件：臨主要道路
東向｜待複核
南向｜待複核
西向｜待複核
北向｜待複核

05｜生活圈與市場定位
交通通勤：待複核
生活機能：待複核
區域條件：待複核
市場定位：自住市場

06｜學區與里別
里別：待複核
基礎教育學區：待複核
中等教育學區：待複核
備註：待複核

07｜目標客群判斷
客群｜購屋動機｜在意條件｜對應產品｜主要抗性
首購族｜自住｜總價｜兩房｜待複核

08｜競案分級與市場行情
市場行情總結：待複核

09｜價格預判
二樓以上住宅：
建議成交價格：30萬／坪
店面：
建議成交價格：40萬／坪
坡道平面車位：
建議成交價格：150萬／位

10｜產品規劃建議
兩房產品：
建議坪數：24坪
對應客群：首購族
總價控制：待複核
規劃理由：待複核
三房產品：
建議坪數：30坪
對應客群：換屋族
總價控制：待複核
規劃理由：待複核
不建議產品：待複核

11｜銷售優勢與抗性
銷售優勢：
1. 區位條件
銷售抗性：
1. 待複核

12｜結論
接案價值：可評估
市場定位：自住市場
建議產品：兩房、三房
建議價格：30萬／坪
主要抗性：待複核
下一步建議：待複核
最終結論：可行`;

const base = {
  report_id: 'report-1', client: '和峻建設', land_number: '善捷段188、189地號', research_date: '2026-07-14',
  report_text: completeReportText, summary: { location: '桃園市龜山區', land_number: '善捷段188、189地號', zoning: '住宅區', area: '100坪', road: '臨主要道路', price: '30萬／坪', product: '兩房、三房', conclusion: '可評估' },
};
const row = (payload = base) => ({ ...payload, created_at: '2026-01-01', updated_at: '2026-01-02' });
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

calls = 0;
data = await run('same report resubmitted', async (_url, init = {}) => { calls++; assert.notEqual(init.method, 'POST'); return response([row()]); });
assert.equal(calls, 1);
assert.equal(data.operation, 'existing_verified');

const changed = { ...base, report_text: completeReportText.replace('最終結論：可行', '最終結論：更新後可行') };
let reads = 0;
data = await run('existing report updated', async (_url, init = {}) => {
  if (init.method === 'POST') return response(null, 200);
  reads += 1; return response([row(reads === 1 ? base : changed)]);
}, changed);
assert.equal(data.operation, 'updated');

data = await run('missing report text', async () => { throw new Error('must not fetch'); }, { ...base, report_text: '' }, 400);
assert.equal(data.status, 'missing_required_fields');

data = await run('incomplete template is rejected before storage', async () => { throw new Error('must not fetch'); }, { ...base, report_text: '01｜案件摘要\n配合業主：和峻建設' }, 422);
assert.equal(data.status, 'template_incomplete');

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

for (const [name, change, status] of [
  ['empty summary', { summary: { ...base.summary, price: '' } }, 'invalid_summary'],
  ['wrong case', { client: '其他業主' }, 'case_mismatch'],
  ['wrong summary parcel', { summary: { ...base.summary, land_number: '他段1地號' } }, 'case_mismatch'],
  ['blank required value', { report_text: completeReportText.replace('容積率：200%', '容積率：') }, 'template_incomplete'],
  ['duplicate heading', { report_text: completeReportText + '\n12｜結論\n最終結論：可行' }, 'template_incomplete'],
]) {
  const result = await run(name, async () => { throw Error('must not access database'); }, { ...base, ...change }, 422);
  assert.equal(result.status, status);
}
const card = name => `競案一｜${name}\n建設公司：測試建商\n競案等級：直接競案\n案子規劃：測試規劃\n屋齡：新屋\n成交期間：2026-01至2026-06\n成交筆數：3\n成交價格：測試數值\n車位類型：坡道平面\n車位價格：待複核\n資訊來源：https://example.org/records\n`;
for (const [name, cards] of [
  ['duplicate competitors', card('測試建案') + card('測試建案')],
  ['missing competitor field', card('測試建案').replace('建設公司：測試建商', '建設公司：')],
]) {
  const result = await run(name, async () => { throw Error('must not access database'); }, { ...base, report_text: completeReportText.replace('市場行情總結：待複核', cards + '市場行情總結：待複核') }, 422);
  assert.equal(result.status, 'template_incomplete');
}
console.log('All submitReport verification tests passed.');
