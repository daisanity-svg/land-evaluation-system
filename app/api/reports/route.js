export const runtime = 'nodejs';

const RAW_SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(payload, init = {}) {
  return Response.json(payload, { ...init, headers: { ...JSON_HEADERS, ...(init.headers || {}) } });
}
function actionJson(payload) { return json(payload, { status: 200 }); }
export async function OPTIONS() { return new Response(null, { status: 204, headers: JSON_HEADERS }); }
function getSupabaseRestUrl() { return (RAW_SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, ''); }
function missingConfig() { return !RAW_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY; }
function value(...items) { return items.find((item) => item !== undefined && item !== null && String(item).trim() !== '') ?? ''; }
function asText(input) {
  if (input === undefined || input === null) return '';
  if (typeof input === 'string') return input;
  if (typeof input === 'object') return String(value(input.report_text, input.reportText, input.report, input.text, JSON.stringify(input)) || '');
  return String(input);
}
function normalizeReportText(input) {
  let text = asText(input).trim();
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') text = asText(value(parsed.report_text, parsed.reportText, parsed.report, parsed.text, text));
  } catch {}
  return String(text).replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function normalizeSummary(summary) {
  if (typeof summary === 'string') { try { summary = JSON.parse(summary); } catch { summary = null; } }
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
  return {
    location: String(value(summary.location, summary.positioning) || '').trim(),
    land_number: String(value(summary.land_number, summary.landNumber) || '').trim(),
    zoning: String(value(summary.zoning, summary.zone) || '').trim(),
    area: String(value(summary.area, summary.base_area) || '').trim(),
    road: String(value(summary.road, summary.road_frontage) || '').trim(),
    price: String(value(summary.price, summary.suggested_price) || '').trim(),
    product: String(value(summary.product, summary.product_recommendation, summary.recommended_products) || '').trim(),
    conclusion: String(value(summary.conclusion) || '').trim(),
  };
}
function flattenActionBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body || {};
  for (const key of ['data', 'arguments', 'input', 'params', 'body', 'requestBody', 'payload']) {
    const nested = body[key];
    if (!nested) continue;
    if (typeof nested === 'string') { try { return flattenActionBody(JSON.parse(nested)); } catch {} }
    if (typeof nested === 'object' && !Array.isArray(nested)) return nested;
  }
  return body;
}
async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return flattenActionBody(await request.json().catch(() => ({})));
  const raw = await request.text();
  if (!raw) return {};
  try { return flattenActionBody(JSON.parse(raw)); } catch { return { report_text: raw }; }
}
function compactData(data) { const text = JSON.stringify(data || ''); return text.length > 900 ? `${text.slice(0, 900)}...` : text; }
function lowerMessage(data) { return JSON.stringify(data || '').toLowerCase(); }
function looksLikeMissingSummaryColumn(data) { const m = lowerMessage(data); return m.includes('summary') && (m.includes('column') || m.includes('schema cache')); }
function looksLikeUniqueConflict(data) { const m = lowerMessage(data); return m.includes('duplicate key') || m.includes('23505'); }
function looksLikeNoConflictConstraint(data) { const m = lowerMessage(data); return m.includes('42p10') || m.includes('no unique') || m.includes('no exclusion constraint') || m.includes('on conflict'); }
async function supabaseFetch(path, { method = 'POST', payload, prefer = 'return=minimal' }) {
  const response = await fetch(`${getSupabaseRestUrl()}${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: prefer },
    body: JSON.stringify(payload),
  });
  const text = await response.text().catch(() => '');
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data };
}
async function saveReportRobust({ report_id, client, land_number, research_date, report_text, summary }) {
  const basePayload = { report_id, client, land_number, research_date, report_text };
  const payloadWithSummary = summary ? { ...basePayload, summary } : basePayload;
  const attempts = [];
  let saved_summary = Boolean(summary);
  async function attempt(name, payload, options) {
    const result = await supabaseFetch(options.path, { method: options.method, payload, prefer: options.prefer });
    attempts.push({ name, ok: result.response.ok, status: result.response.status, detail: result.response.ok ? 'ok' : compactData(result.data) });
    return result;
  }
  let result = await attempt('upsert_with_summary_or_base', payloadWithSummary, { path: '/rest/v1/reports?on_conflict=report_id', method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal' });
  if (result.response.ok) return { ok: true, saved_summary, attempts };
  if (summary && looksLikeMissingSummaryColumn(result.data)) {
    result = await attempt('upsert_without_summary_after_missing_column', basePayload, { path: '/rest/v1/reports?on_conflict=report_id', method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal' });
    saved_summary = false;
    if (result.response.ok) return { ok: true, saved_summary, attempts };
  }
  if (looksLikeNoConflictConstraint(result.data)) {
    result = await attempt('plain_insert_after_no_conflict_constraint', saved_summary ? payloadWithSummary : basePayload, { path: '/rest/v1/reports', method: 'POST', prefer: 'return=minimal' });
    if (result.response.ok) return { ok: true, saved_summary, attempts };
  }
  if (summary && looksLikeMissingSummaryColumn(result.data)) {
    result = await attempt('plain_insert_without_summary_after_missing_column', basePayload, { path: '/rest/v1/reports', method: 'POST', prefer: 'return=minimal' });
    saved_summary = false;
    if (result.response.ok) return { ok: true, saved_summary, attempts };
  }
  if (looksLikeUniqueConflict(result.data)) {
    result = await attempt('patch_existing_report_id', saved_summary ? payloadWithSummary : basePayload, { path: `/rest/v1/reports?report_id=eq.${encodeURIComponent(report_id)}`, method: 'PATCH', prefer: 'return=minimal' });
    if (result.response.ok) return { ok: true, saved_summary, attempts };
    if (summary && looksLikeMissingSummaryColumn(result.data)) {
      result = await attempt('patch_existing_report_id_without_summary', basePayload, { path: `/rest/v1/reports?report_id=eq.${encodeURIComponent(report_id)}`, method: 'PATCH', prefer: 'return=minimal' });
      saved_summary = false;
      if (result.response.ok) return { ok: true, saved_summary, attempts };
    }
  }
  return { ok: false, saved_summary, attempts, last_error: result.data, last_status: result.response.status };
}
function createManualPayload({ report_id, client, land_number, research_date, report_text, summary }) { return { report_id, client, land_number, research_date, summary, report_text }; }
export async function POST(request) {
  try {
    const body = await readBody(request);
    const report_id = String(value(body.report_id, body.reportId, body.id) || '').trim();
    const report_text = normalizeReportText(value(body.report_text, body.reportText, body.report, body.text));
    const client = String(value(body.client, body.client_name, body.clientName) || '').trim();
    const land_number = String(value(body.land_number, body.landNumber, body.land_no, body.landNo) || '').trim();
    const research_date = String(value(body.research_date, body.researchDate, body.date) || '').trim();
    const summary = normalizeSummary(body.summary);
    if (!report_id || !report_text) return actionJson({ ok: false, status: 'missing_required_fields', message: '缺少 report_id 或 report_text，請回傳完整 JSON 或改用手動貼回。', error: 'report_id and report_text are required.', report_id, client, land_number, research_date, has_report_id: Boolean(report_id), has_report_text: Boolean(report_text), keys: Object.keys(body || {}) });
    if (missingConfig()) return actionJson({ ok: false, status: 'missing_config_manual_fallback', message: '系統後端環境變數尚未設定，請將 manual_payload 貼回土地評估系統。', report_id, client, land_number, research_date, manual_payload: createManualPayload({ report_id, client, land_number, research_date, report_text, summary }) });
    const saved = await saveReportRobust({ report_id, client, land_number, research_date, report_text, summary });
    if (!saved.ok) return actionJson({ ok: false, status: 'supabase_save_failed_manual_fallback', message: 'Supabase 儲存失敗，請將 manual_payload 貼回土地評估系統。', error: 'Failed to save report.', report_id, client, land_number, research_date, saved_summary: saved.saved_summary, supabase_status: saved.last_status, detail: compactData(saved.last_error), attempts: saved.attempts, manual_payload: createManualPayload({ report_id, client, land_number, research_date, report_text, summary }) });
    return actionJson({ ok: true, status: 'saved', message: '報告已成功送回土地評估系統。', report_id, client, land_number, research_date, saved_summary: saved.saved_summary });
  } catch (error) {
    return actionJson({ ok: false, status: 'server_error', message: '伺服器錯誤，請改用手動貼回。', error: error.message || 'Server error.' });
  }
}
