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

export async function POST(request) {
  try {
    if (missingConfig()) {
      return json(
        { ok: false, error: 'Supabase environment variables are not configured.' },
        { status: 500 }
      );
    }

    const body = await readBody(request);
    const report_id = String(value(body.report_id, body.reportId, body.id) || '').trim();
    const report_text = String(value(body.report_text, body.reportText, body.report, body.text) || '').trim();
    const client = String(value(body.client, body.client_name, body.clientName) || '').trim();
    const land_number = String(value(body.land_number, body.landNumber, body.land_no, body.landNo) || '').trim();
    const research_date = String(value(body.research_date, body.researchDate, body.date) || '').trim();
    const summary = normalizeSummary(body.summary);

    if (!report_id || !report_text) {
      return json(
        {
          ok: false,
          error: 'report_id and report_text are required.',
          received: {
            has_report_id: Boolean(report_id),
            has_report_text: Boolean(report_text),
            keys: Object.keys(body || {}),
          },
        },
        { status: 400 }
      );
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

    // 相容舊資料庫：若 reports 尚未新增 summary 欄位，先退回舊格式，避免 submitReport 中斷。
    if (!supabaseResponse.ok && summary && looksLikeMissingSummaryColumn(data)) {
      ({ supabaseResponse, data } = await writeReportToSupabase(basePayload));
      saved_summary = false;
    }

    // 若資料庫唯一鍵未正確套用 upsert header，將 duplicate 視為可讀取既有報告的成功狀態，避免 GPT Action 中斷。
    if (!supabaseResponse.ok && looksLikeUniqueConflict(data)) {
      return json({
        ok: true,
        status: 'duplicate_treated_as_saved',
        report_id,
        client,
        land_number,
        research_date,
        saved_summary,
      });
    }

    if (!supabaseResponse.ok) {
      return json(
        { ok: false, error: 'Failed to save report.', detail: data, supabase_path: '/rest/v1/reports' },
        { status: supabaseResponse.status }
      );
    }

    // 回給 GPT Action 的內容刻意保持精簡，避免 report_text 太大造成 ClientResponseError。
    return json({
      ok: true,
      status: 'saved',
      report_id,
      client,
      land_number,
      research_date,
      saved_summary,
    });
  } catch (error) {
    return json({ ok: false, error: error.message || 'Server error.' }, { status: 500 });
  }
}
