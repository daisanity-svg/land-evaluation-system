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

const REQUIRED_SECTIONS = [
  '01｜案件摘要', '02｜基地基本條件', '03｜法規與量體初判', '04｜臨路條件與基地四向現況',
  '05｜生活圈與市場定位', '06｜學區與里別', '07｜目標客群判斷', '08｜競案分級與市場行情',
  '09｜價格預判', '10｜產品規劃建議', '11｜銷售優勢與抗性', '12｜結論',
];
const REQUIRED_TEMPLATE_FIELDS = {
  '01｜案件摘要': ['配合業主', '調研日期', '目標地號', '基地位置', '土地使用分區', '基地面積', '建蔽率', '容積率', '臨路條件', '初步市場定位', '建議價格', '建議產品', '初步結論', '本案快速結論'],
  '03｜法規與量體初判': ['土地使用分區', '建蔽率', '容積率'],
  '04｜臨路條件與基地四向現況': ['臨路條件', '東向', '南向', '西向', '北向'],
  '05｜生活圈與市場定位': ['交通通勤', '生活機能', '區域條件', '市場定位'],
  '06｜學區與里別': ['里別', '基礎教育學區', '中等教育學區', '備註'],
  '08｜競案分級與市場行情': ['市場行情總結'],
  '09｜價格預判': ['二樓以上住宅', '店面', '坡道平面車位'],
  '10｜產品規劃建議': ['兩房產品', '三房產品', '不建議產品'],
  '11｜銷售優勢與抗性': ['銷售優勢', '銷售抗性'],
  '12｜結論': ['接案價值', '市場定位', '建議產品', '建議價格', '主要抗性', '下一步建議', '最終結論'],
};

function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function splitReportSections(reportText) {
  const source = String(reportText || '').replace(/\r\n?/g, '\n');
  const matches = Array.from(source.matchAll(/^\s*(\d{2})\s*[｜|]\s*([^\n]+?)\s*$/gm));
  const sections = {};
  matches.forEach((match, index) => {
    const heading = `${match[1]}｜${match[2].trim()}`;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    sections[heading] = source.slice(match.index + match[0].length, end).trim();
  });
  return sections;
}
function hasTemplateField(section, field) {
  const escaped = escapeRegExp(field);
  return new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?${escaped}\\s*(?:[：:｜|]|$)`, 'm').test(section);
}
function validateTemplate(reportText) {
  const sections = splitReportSections(reportText);
  const missing = [];
  REQUIRED_SECTIONS.forEach((heading) => { if (!sections[heading]) missing.push(heading); });
  if (missing.length) return missing;
  Object.entries(REQUIRED_TEMPLATE_FIELDS).forEach(([heading, fields]) => {
    fields.forEach((field) => { if (!hasTemplateField(sections[heading], field)) missing.push(`${heading}／${field}`); });
  });
  const priceSection = sections['09｜價格預判'];
  const priceCount = (priceSection.match(/建議成交價格\s*[：:]/g) || []).length;
  if (priceCount < 3) missing.push('09｜價格預判／三項建議成交價格');
  const productSection = sections['10｜產品規劃建議'];
  ['建議坪數', '對應客群', '總價控制', '規劃理由'].forEach((field) => {
    if ((productSection.match(new RegExp(`${escapeRegExp(field)}\\s*[：:]`, 'g')) || []).length < 2) missing.push(`10｜產品規劃建議／兩房與三房皆須有${field}`);
  });
  return missing;
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
    const templateMissing = validateTemplate(payload.report_text);
    if (templateMissing.length) {
      return failure('template_incomplete', 422, id, report_id, 'Report template is incomplete.', `請補齊固定欄位後重新呼叫 submitReport：${templateMissing.join('、')}`);
    }

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

export const _test = { normalizeSummary, completeAndMatching, safeDetail, validateTemplate };
