export const runtime = 'nodejs';

const RAW_SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseRestUrl() {
  if (!RAW_SUPABASE_URL) return '';
  return RAW_SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

export async function GET() {
  const startedAt = Date.now();
  const result = {
    ok: true,
    status: 'healthy',
    service: 'land-evaluation-system',
    timestamp: new Date().toISOString(),
    supabase: {
      configured: Boolean(RAW_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
      ok: false,
      status: null,
      detail: null
    }
  };

  if (!RAW_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    result.ok = false;
    result.status = 'missing_config';
    result.supabase.detail = 'Supabase environment variables are not configured.';
    result.duration_ms = Date.now() - startedAt;
    return Response.json(result, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const supabaseBaseUrl = getSupabaseRestUrl();
    const response = await fetch(`${supabaseBaseUrl}/rest/v1/reports?select=report_id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    result.supabase.status = response.status;
    result.supabase.ok = response.ok;

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      result.ok = false;
      result.status = 'supabase_unhealthy';
      result.supabase.detail = text.slice(0, 500);
    }
  } catch (error) {
    result.ok = false;
    result.status = 'supabase_fetch_failed';
    result.supabase.detail = error.message || 'fetch failed';
  }

  result.duration_ms = Date.now() - startedAt;
  return Response.json(result, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
