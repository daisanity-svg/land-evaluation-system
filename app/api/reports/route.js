export const runtime = 'nodejs';

const RAW_SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function normalizeSummary(summary) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
  return {
    location: String(summary.location || '').trim(),
    land_number: String(summary.land_number || summary.landNumber || '').trim(),
    zoning: String(summary.zoning || summary.zone || '').trim(),
    area: String(summary.area || '').trim(),
    road: String(summary.road || summary.road_frontage || '').trim(),
    price: String(summary.price || summary.suggested_price || '').trim(),
    product: String(summary.product || summary.product_recommendation || '').trim(),
    conclusion: String(summary.conclusion || '').trim(),
  };
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

  const data = await supabaseResponse.json().catch(() => null);
  return { supabaseResponse, data };
}

function looksLikeMissingSummaryColumn(data) {
  const message = JSON.stringify(data || '').toLowerCase();
  return message.includes('summary') && (message.includes('column') || message.includes('schema cache'));
}

export async function POST(request) {
  try {
    if (missingConfig()) {
      return Response.json(
        { error: 'Supabase environment variables are not configured.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const report_id = String(body.report_id || '').trim();
    const report_text = String(body.report_text || '').trim();
    const summary = normalizeSummary(body.summary);

    if (!report_id || !report_text) {
      return Response.json(
        { error: 'report_id and report_text are required.' },
        { status: 400 }
      );
    }

    const basePayload = {
      report_id,
      client: body.client || '',
      land_number: body.land_number || '',
      research_date: body.research_date || '',
      report_text,
    };

    const payload = summary ? { ...basePayload, summary } : basePayload;
    let { supabaseResponse, data } = await writeReportToSupabase(payload);

    // 相容舊資料庫：若 reports 尚未新增 summary 欄位，先退回舊格式，避免 submitReport 中斷。
    if (!supabaseResponse.ok && summary && looksLikeMissingSummaryColumn(data)) {
      ({ supabaseResponse, data } = await writeReportToSupabase(basePayload));
    }

    if (!supabaseResponse.ok) {
      return Response.json(
        { error: 'Failed to save report.', detail: data, supabase_path: '/rest/v1/reports' },
        { status: supabaseResponse.status }
      );
    }

    return Response.json({ ok: true, report: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    return Response.json({ error: error.message || 'Server error.' }, { status: 500 });
  }
}
