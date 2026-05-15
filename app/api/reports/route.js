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

function okJson(payload) {
  return json({ ok: true, status: 'saved', ...payload }, { status: 200 });
}

function softFailJson(payload) {
  // GPT Actions are more stable when the HTTP layer stays 200 and the app-level
  // status explains the issue. The UI can still read ok:false and show details.
  return json({ ok: false, ...payload }, { status: 200 });
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

function maybeParseJsonString(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text || (!text.startsWith('{') && !text.startsWith('['))) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function flattenActionBody(body) {
  let current = maybeParseJsonString(body);
  for (let i = 0; i < 4; i += 1) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current || {};
    const next = current.data || current.arguments || current.input || current.params || current.body || current.payload;
    if (!next || typeof next !== 'object' || Array.isArray(next)) return current;
    current = maybeParseJsonString(next);
  }
  return current;
}

async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const parsed = await request.json().catch(() => ({}));
    return flattenActionBody(parsed);
  }

  const raw = await request.text();
  if (!raw) return {};
  const parsed = maybeParseJsonString(raw);
  if (parsed && typeof parsed === 'object') return flattenActionBody(parsed);
  return { report_text: raw };
}

function buildReportText(body) {
  const direct = value(body.report_text, body.reportText, body.report, body.text, body.content);
  if (direct) return String(direct).trim();

  if (Array.isArray(body.sections)) {
    return body.sections.map((section) => {
      if (typeof section === 'string') return section;
      if (!section || typeof section !== 'object') return '';
      return [section.title, section.content, section.text].filter(Boolean).join('\n');
    }).filter(Boolean).join('\n\n').trim();
  }

  return '';
}

async function writeReportToSupabase(payload) {
  const supabaseBaseUrl = getSupabaseRestUrl();
  const supabaseResponse = await fetch(`${supabaseBaseUrl}/rest/v1/reports`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
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
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

function firstSavedRow(data) {
  return Array.isArray(data) ? data[0] : data && typeof data === 'object' ? data : null;
}

async function verifyReportSaved(report_id) {
  const supabaseBaseUrl = getSupabaseRestUrl();
  const url = `${supabaseBaseUrl}/rest/v1/reports?report_id=eq.${encodeURIComponent(report_id)}&select=report_id,client,land_number,research_date`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  return response.ok && Array.isArray(data) && data.length > 0;
}

export async function POST(request) {
  try {
    if (missingConfig()) {
      return softFailJson({ status: 'missing_config', error: 'Supabase environment variables are not configured.' });
    }

    const body = await readBody(request);
    const report_id = String(value(body.report_id, body.reportId, body.id) || '').trim();
    const report_text = buildReportText(body);
    const client = String(value(body.client, body.client_name, body.clientName, body.developer, body.company) || '').trim();
    const land_number = String(value(body.land_number, body.landNumber, body.land_no, body.landNo, body.target_land, body.target) || '').trim();
    const research_date = String(value(body.research_date, body.researchDate, body.date) || '').trim();
    const summary = normalizeSummary(body.summary);

    if (!report_id || !report_text) {
      return softFailJson({
        status: 'missing_required_fields',
        error: 'report_id and report_text are required.',
        report_id,
        client,
        land_number,
        research_date,
        has_report_id: Boolean(report_id),
        has_report_text: Boolean(report_text),
        keys: Object.keys(body || {}).slice(0, 30),
      });
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
      const verified = await verifyReportSaved(report_id).catch(() => false);
      return okJson({
        status: verified ? 'duplicate_verified_saved' : 'duplicate_treated_as_saved',
        report_id,
        client,
        land_number,
        research_date,
        saved_summary,
        verified,
      });
    }

    if (!supabaseResponse.ok) {
      return softFailJson({
        status: 'supabase_save_failed',
        error: 'Failed to save report.',
        report_id,
        client,
        land_number,
        research_date,
        saved_summary,
        supabase_status: supabaseResponse.status,
        detail: compact(data),
      });
    }

    const savedRow = firstSavedRow(data);
    const verified = savedRow ? true : await verifyReportSaved(report_id).catch(() => false);

    return okJson({
      report_id,
      client,
      land_number,
      research_date,
      saved_summary,
      verified,
      report: savedRow
        ? {
            report_id: savedRow.report_id,
            client: savedRow.client,
            land_number: savedRow.land_number,
            research_date: savedRow.research_date,
          }
        : null,
    });
  } catch (error) {
    return softFailJson({ status: 'server_error', error: error.message || 'Server error.' });
  }
}
