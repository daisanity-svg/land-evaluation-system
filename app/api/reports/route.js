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
  return Response.json(payload, {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {}),
    },
  });
}

function actionJson(payload) {
  return json(payload, { status: 200 });
}

function successPayload(extra) {
  return {
    success: true,
    ok: true,
    saved: true,
    status: 'saved',
    message: '報告已成功送回土地評估系統。',
    ...extra,
  };
}

function failPayload(status, extra) {
  return {
    success: false,
    ok: false,
    saved: false,
    status,
    message: '報告尚未成功送回土地評估系統。',
    ...extra,
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

function getSupabaseRestUrl() {
  if (!RAW_SUPABASE_URL) return '';
  return RAW_SUPABASE_URL
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '');
}

function missingConfig() {
  return !RAW_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY;
}

function value(...items) {
  return items.find((item) => item !== undefined && item !== null && String(item).trim() !== '') ?? '';
}

function normalizeSummary(summary) {
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
  if (body.data && typeof body.data === 'object') return body.data;
  if (body.arguments && typeof body.arguments === 'object') return body.arguments;
  if (body.input && typeof body.input === 'object') return body.input;
  if (body.params && typeof body.params === 'object') return body.params;
  return body;
}

async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const parsed = await request.json().catch(() => ({}));
    return flattenActionBody(parsed);
  }

  const raw = await request.text();
  if (!raw) return {};
  try {
    return flattenActionBody(JSON.parse(raw));
  } catch {
    return { report_text: raw };
  }
}

async function writeReportToSupabase(payload) {
  const supabaseBaseUrl = getSupabaseRestUrl();
  const supabaseResponse = await fetch(`${supabaseBaseUrl}/rest/v1/reports`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });

  const text = await supabaseResponse.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { supabaseResponse, data };
}

function looksLikeMissingSummaryColumn(data) {
  const message = JSON.stringify(data || '').toLowerCase();
  return message.includes('summary') && (message.includes('column') || message.includes('schema cache'));
}

function looksLikeUniqueConflict(data) {
  const message = JSON.stringify(data || '').toLowerCase();
  return message.includes('duplicate key') || message.includes('23505');
}

function compact(data) {
  const text = JSON.stringify(data || '');
  return text.length > 700 ? `${text.slice(0, 700)}...` : text;
}

export async function POST(request) {
  try {
    if (missingConfig()) {
      return actionJson(failPayload('missing_config', { error: 'Supabase environment variables are not configured.' }));
    }

    const body = await readBody(request);
    const report_id = String(value(body.report_id, body.reportId, body.id) || '').trim();
    const report_text = String(value(body.report_text, body.reportText, body.report, body.text) || '').trim();
    const client = String(value(body.client, body.client_name, body.clientName) || '').trim();
    const land_number = String(value(body.land_number, body.landNumber, body.land_no, body.landNo) || '').trim();
    const research_date = String(value(body.research_date, body.researchDate, body.date) || '').trim();
    const summary = normalizeSummary(body.summary);

    if (!report_id || !report_text) {
      return actionJson(failPayload('missing_required_fields', {
        error: 'report_id and report_text are required.',
        report_id,
        client,
        land_number,
        research_date,
        has_report_id: Boolean(report_id),
        has_report_text: Boolean(report_text),
        keys: Object.keys(body || {}),
      }));
    }

    const basePayload = {
      report_id,
      client,
      land_number,
      research_date,
      report_text,
    };

    const payload = summary ? { ...basePayload, summary } : basePayload;
    let { supabaseResponse, data } = await writeReportToSupabase(payload);
    let saved_summary = Boolean(summary);

    if (!supabaseResponse.ok && summary && looksLikeMissingSummaryColumn(data)) {
      ({ supabaseResponse, data } = await writeReportToSupabase(basePayload));
      saved_summary = false;
    }

    if (!supabaseResponse.ok && looksLikeUniqueConflict(data)) {
      return actionJson(successPayload({
        status: 'duplicate_treated_as_saved',
        report_id,
        client,
        land_number,
        research_date,
        saved_summary,
      }));
    }

    if (!supabaseResponse.ok) {
      return actionJson(failPayload('supabase_save_failed', {
        error: 'Failed to save report.',
        report_id,
        client,
        land_number,
        research_date,
        saved_summary,
        supabase_status: supabaseResponse.status,
        detail: compact(data),
      }));
    }

    return actionJson(successPayload({
      report_id,
      client,
      land_number,
      research_date,
      saved_summary,
    }));
  } catch (error) {
    return actionJson(failPayload('server_error', { error: error.message || 'Server error.' }));
  }
}
