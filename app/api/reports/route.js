export const runtime = 'nodejs';

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const value = (...items) => items.find((item) => item !== undefined && item !== null && String(item).trim() !== '') ?? '';

function json(payload, status) {
  return Response.json(payload, { status, headers: JSON_HEADERS });
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function config() {
  const rawUrl = process.env.SUPABASE_URL || '';
  return {
    baseUrl: rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

function supabaseHeaders(extra = {}) {
  const { key } = config();
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}

function normalizeSummary(summary) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
  return {
    location: String(value(summary.location, summary.positioning)).trim(),
    land_number: String(value(summary.land_number, summary.landNumber)).trim(),
    zoning: String(value(summary.zoning, summary.zone)).trim(),
    area: String(value(summary.area, summary.base_area)).trim(),
    road: String(value(summary.road, summary.road_frontage)).trim(),
    price: String(value(summary.price, summary.suggested_price)).trim(),
    product: String(value(summary.product, summary.product_recommendation, summary.recommended_products)).trim(),
    conclusion: String(value(summary.conclusion)).trim(),
  };
}

function flattenActionBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body || {};
  for (const key of ['data', 'arguments', 'input', 'params', 'payload']) {
    if (body[key] && typeof body[key] === 'object' && !Array.isArray(body[key])) return body[key];
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

function safeDetail(input) {
  const { key } = config();
  let text = typeof input === 'string' ? input : JSON.stringify(input || 'No Supabase response.');
  for (const secret of [key, process.env.SUPABASE_SERVICE_ROLE_KEY]) {
    if (secret) text = text.split(secret).join('[REDACTED]');
  }
  text = text.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]');
  return text.slice(0, 700);
}

function failure(status, httpStatus, id, report_id, error, detail) {
  return json({
    success: false, ok: false, saved: false, verified: false,
    status, report_id: report_id || '', request_id: id, error, detail: safeDetail(detail),
  }, httpStatus);
}

async function fetchExisting(reportId) {
  const { baseUrl } = config();
  const url = `${baseUrl}/rest/v1/reports?report_id=eq.${encodeURIComponent(reportId)}&select=*&limit=1`;
  const response = await fetch(url, { headers: supabaseHeaders(), cache: 'no-store' });
  const data = await response.json().catch(() => null);
  return { response, data, row: response.ok && Array.isArray(data) ? data[0] || null : null };
}

async function upsertOnce(payload) {
  const { baseUrl } = config();
  const response = await fetch(`${baseUrl}/rest/v1/reports?on_conflict=report_id`, {
    method: 'POST',
    headers: supabaseHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(payload),
  });
  const text = await response.text().catch(() => '');
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { response, data };
}

async function upsertWithRetry(payload) {
  const delays = [0, 200, 500];
  let last;
  for (let i = 0; i < delays.length; i += 1) {
    if (delays[i]) await sleep(delays[i]);
    try {
      last = { ...(await upsertOnce(payload)), attempt: i + 1 };
      if (last.response.ok || (last.response.status < 500 && ![408, 429].includes(last.response.status))) return last;
    } catch (error) { last = { response: null, data: error?.message || 'fetch failed', attempt: i + 1 }; }
  }
  return last;
}

function sameJson(a, b) {
  const canonical = (input) => {
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === 'object') {
      return Object.keys(input).sort().reduce((result, key) => {
        result[key] = canonical(input[key]);
        return result;
      }, {});
    }
    return input ?? null;
  };
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function completeAndMatching(row, payload) {
  return Boolean(row
    && row.report_id === payload.report_id
    && row.report_text === payload.report_text
    && row.client === payload.client
    && row.land_number === payload.land_number
    && row.research_date === payload.research_date
    && row.summary && typeof row.summary === 'object'
    && sameJson(row.summary, payload.summary));
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export async function POST(request) {
  const id = requestId();
  let report_id = '';
  try {
    const body = await readBody(request);
    report_id = String(value(body.report_id, body.reportId, body.id)).trim();
    const payload = {
      report_id,
      client: String(value(body.client, body.client_name, body.clientName)).trim(),
      land_number: String(value(body.land_number, body.landNumber, body.land_no, body.landNo)).trim(),
      research_date: String(value(body.research_date, body.researchDate, body.date)).trim(),
      report_text: String(value(body.report_text, body.reportText, body.report, body.text)).trim(),
      summary: normalizeSummary(body.summary),
    };

    const missing = ['report_id', 'client', 'land_number', 'research_date', 'report_text'].filter((key) => !payload[key]);
    if (missing.length) return failure('missing_required_fields', 400, id, report_id, 'Missing required fields.', `Missing: ${missing.join(', ')}`);
    if (!payload.summary) return failure('invalid_summary', 400, id, report_id, 'summary must be a JSON object.', 'The summary field is missing or invalid.');

    const { baseUrl, key } = config();
    if (!baseUrl || !key) return failure('missing_config', 500, id, report_id, 'Supabase environment variables are not configured.', 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

    const before = await fetchExisting(report_id);
    if (!before.response.ok) {
      const upstream = [401, 403].includes(before.response.status) ? before.response.status : 502;
      return failure('supabase_read_failed', upstream, id, report_id, 'Failed to inspect existing report.', before.data);
    }

    const write = await upsertWithRetry(payload);
    if (!write?.response?.ok) {
      const upstream = [401, 403].includes(write?.response?.status) ? write.response.status : 502;
      return failure('supabase_save_failed', upstream, id, report_id, 'Failed to save report.', write?.data);
    }

    const verification = await fetchExisting(report_id);
    if (!verification.response.ok) {
      const upstream = [401, 403].includes(verification.response.status) ? verification.response.status : 502;
      return failure('supabase_verification_failed', upstream, id, report_id, 'Report was written but could not be verified.', verification.data);
    }
    if (!completeAndMatching(verification.row, payload)) {
      return failure('verification_mismatch', 502, id, report_id, 'Report verification failed.', 'Stored record is missing required fields or does not match the submitted payload.');
    }

    const operation = before.row ? (completeAndMatching(before.row, payload) ? 'existing_verified' : 'updated') : 'created';
    return json({
      success: true, ok: true, saved: true, verified: true, operation,
      report_id, request_id: id, message: '報告已成功儲存並完成驗證。',
    }, operation === 'created' ? 201 : 200);
  } catch (error) {
    return failure('server_error', 500, id, report_id, 'Unexpected server error.', error?.message || 'Server error.');
  }
}

export const _test = { normalizeSummary, completeAndMatching, safeDetail };
