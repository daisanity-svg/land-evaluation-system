import { POST as gptSubmitPost } from '../../gpt-submit-report/route.js';
import { POST as reportsPost } from '../../reports/route.js';
import { POST as submitReportPost } from '../../submitReport/route.js';
import { POST as submitHiyesPost } from '../../submitHiyesReport/route.js';
import { POST as submitHiyesKebabPost } from '../../submit-hiyes-report/route.js';
import { GET as reportGet } from '../../reports/[reportId]/route.js';

export const runtime = 'nodejs';

function json(payload) {
  return Response.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

function payload(reportId) {
  return {
    report_id: reportId,
    client: '系統自動回傳測試',
    land_number: '測試段 1 地號',
    research_date: new Date().toISOString().slice(0, 10),
    summary: {
      location: '測試位置',
      land_number: '測試段 1 地號',
      zoning: '住宅區',
      area: '100坪',
      road: '10米道路',
      price: '住宅48～52萬/坪；店面60～70萬/坪；車位180～220萬/位',
      product: '兩房、三房',
      conclusion: '自動測試結論'
    },
    report_text: '01｜案件摘要\n本次為 GPT Action 自動回傳與查回測試。\n\n12｜結論\n若本筆可查回，代表 submitReport 寫入與系統載入皆正常。'
  };
}

async function invoke(name, handler, reportId) {
  const req = new Request(`https://land-evaluation-system.vercel.app/api/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload(reportId))
  });
  const res = await handler(req);
  const body = await res.json().catch(() => null);
  const submitOk = Boolean(body?.success || body?.ok || body?.saved || body?.status === 'saved' || body?.status === 'updated' || body?.status === 'duplicate_treated_as_saved');

  const getReq = new Request(`https://land-evaluation-system.vercel.app/api/reports/${encodeURIComponent(reportId)}`, { method: 'GET' });
  const getRes = await reportGet(getReq, { params: { reportId } });
  const getBody = await getRes.json().catch(() => null);
  const readOk = Boolean(getRes.ok && getBody?.report?.report_text);

  return {
    name,
    report_id: reportId,
    submit_http_status: res.status,
    submit_ok: submitOk,
    submit_status: body?.status || null,
    submit_message: body?.message || null,
    submit_error: body?.error || null,
    read_http_status: getRes.status,
    read_ok: readOk,
    read_client: getBody?.report?.client || null,
    read_has_text: Boolean(getBody?.report?.report_text),
    read_error: getBody?.error || null
  };
}

export async function GET() {
  const base = `diag-action-${Date.now()}`;
  const routes = [
    ['gpt-submit-report', gptSubmitPost],
    ['reports', reportsPost],
    ['submitReport', submitReportPost],
    ['submitHiyesReport', submitHiyesPost],
    ['submit-hiyes-report', submitHiyesKebabPost]
  ];
  const results = [];
  for (const [name, handler] of routes) {
    results.push(await invoke(name, handler, `${base}-${name}`));
  }
  const passed = results.every((item) => item.submit_ok && item.read_ok);
  return json({ diagnostic: 'action-submit-persistence', passed, results });
}
