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

function unwrap(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body || {};
  if (body.data && typeof body.data === 'object') return body.data;
  if (body.arguments && typeof body.arguments === 'object') return body.arguments;
  if (body.input && typeof body.input === 'object') return body.input;
  if (body.params && typeof body.params === 'object') return body.params;
  if (body.payload && typeof body.payload === 'object') return body.payload;
  return body;
}

async function readBody(request) {
  const raw = await request.text();
  if (!raw) return {};
  try {
    return unwrap(JSON.parse(raw));
  } catch {
    return { report_text: raw };
  }
}

async function saveToSupabase(payload) {
  const supabaseBaseUrl = getSupabaseRestUrl();
  const response = await fetch(`${supabaseBaseUrl}/rest/v1/reports`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text().catch(() => '');
  let detail = text;
  try {
    detail = text ? JSON.parse(text) : null;
  } catch {}
  return { response, detail };
}

function compact(detail) {
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail || '');
  return text.length > 700 ? `${text.slice(0, 700)}...` : text;
}

function isSummaryColumnProblem(detail) {
  const text = JSON.stringify(detail || '').toLowerCase();
  return text.includes('summary') && (text.includes('column') || text.includes('schema cache'));
}

function isDuplicate(detail) {
  const text = JSON.stringify(detail || '').toLowerCase();
  return text.includes('duplicate key') || text.includes('23505');
}

export async function POST(request) {
  try {
    if (!RAW_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, status: 'missing_config', error: 'Supabase environment variables missing.' }, { status: 200 });
    }

    const body = await readBody(request);
    const report_id = String(value(body.report_id, body.reportId, body.id) || '').trim();
    const report_text = String(value(body.report_text, body.reportText, body.report, body.text, body.content) || '').trim();
    const client = String(value(body.client, body.client_name, body.clientName, body.developer, body.company) || '').trim();
    const land_number = String(value(body.land_number, body.landNumber, body.land_no, body.landNo, body.target_land, body.target) || '').trim();
    const research_date = String(value(body.research_date, body.researchDate, body.date) || '').trim();
    const summary = normalizeSummary(body.summary);

    if (!report_id || !report_text) {
      return json({
        ok: false,
        status: 'missing_required_fields',
        error: 'report_id and report_text are required.',
        report_id,
        has_report_id: Boolean(report_id),
        has_report_text: Boolean(report_text),
        keys: Object.keys(body || {}),
      }, { status: 200 });
    }

    const basePayload = { report_id, client, land_number, research_date, report_text };
    const fullPayload = summary ? { ...basePayload, summary } : basePayload;

    let { response, detail } = await saveToSupabase(fullPayload);
    let saved_summary = Boolean(summary);

    if (!response.ok && summary && isSummaryColumnProblem(detail)) {
      ({ response, detail } = await saveToSupabase(basePayload));
      saved_summary = false;
    }

    if (!response.ok && isDuplicate(detail)) {
      return json({ ok: true, status: 'duplicate_treated_as_saved', report_id, client, land_number, research_date, saved_summary }, { status: 200 });
    }

    if (!response.ok) {
      return json({
        ok: false,
        status: 'supabase_save_failed',
        error: 'Failed to save report.',
        report_id,
        client,
        land_number,
        research_date,
        saved_summary,
        supabase_status: response.status,
        detail: compact(detail),
      }, { status: 200 });
    }

    return json({ ok: true, status: 'saved', report_id, client, land_number, research_date, saved_summary }, { status: 200 });
  } catch (error) {
    return json({ ok: false, status: 'server_error', error: error.message || 'Server error.' }, { status: 200 });
  }
}
