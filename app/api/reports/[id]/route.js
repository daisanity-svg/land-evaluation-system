export const runtime = 'nodejs';

const RAW_SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

function safeId(value) {
  return decodeURIComponent(String(value || '').trim());
}

function normalizeReport(row) {
  if (!row) return null;
  return {
    id: row.id ?? null,
    report_id: row.report_id ?? '',
    client: row.client ?? '',
    land_number: row.land_number ?? '',
    research_date: row.research_date ?? '',
    summary: row.summary ?? null,
    report_text: row.report_text ?? '',
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function GET(_request, context) {
  try {
    const report_id = safeId(context?.params?.id);

    if (!report_id) {
      return json({ ok: false, status: 'missing_report_id', error: 'report_id is required.' }, { status: 400 });
    }

    if (missingConfig()) {
      return json({ ok: false, status: 'missing_config', error: 'Supabase environment variables are not configured.', report_id }, { status: 500 });
    }

    const supabaseBaseUrl = getSupabaseRestUrl();
    const url = `${supabaseBaseUrl}/rest/v1/reports?report_id=eq.${encodeURIComponent(report_id)}&select=*&limit=1`;

    const supabaseResponse = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const text = await supabaseResponse.text().catch(() => '');
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!supabaseResponse.ok) {
      return json({
        ok: false,
        status: 'supabase_lookup_failed',
        error: 'Failed to lookup report.',
        report_id,
        supabase_status: supabaseResponse.status,
        detail: data,
      }, { status: 200 });
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (!row) {
      return json({ ok: false, status: 'not_found', report_id, report: null }, { status: 200 });
    }

    return json({ ok: true, status: 'found', report_id, report: normalizeReport(row) }, { status: 200 });
  } catch (error) {
    return json({ ok: false, status: 'server_error', error: error.message || 'Server error.' }, { status: 200 });
  }
}
