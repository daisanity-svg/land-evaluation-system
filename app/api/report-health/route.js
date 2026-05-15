export const runtime = 'nodejs';

const RAW_SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

async function checkSupabase() {
  if (!RAW_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      configured: false,
      ok: false,
      status: 'missing_config',
    };
  }

  try {
    const baseUrl = getSupabaseRestUrl();
    const response = await fetch(`${baseUrl}/rest/v1/reports?select=report_id&limit=1`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: 'no-store',
    });

    const text = await response.text().catch(() => '');
    return {
      configured: true,
      ok: response.ok,
      status: response.status,
      detail: response.ok ? 'reports table reachable' : text.slice(0, 300),
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      status: 'fetch_failed',
      detail: error.message || 'Supabase check failed',
    };
  }
}

export async function GET() {
  const supabase = await checkSupabase();
  return json({
    ok: true,
    endpoint: '/api/report-health',
    method: 'GET',
    deployed: true,
    timestamp: new Date().toISOString(),
    supabase,
  }, { status: 200 });
}

export async function POST(request) {
  const raw = await request.text().catch(() => '');
  const supabase = await checkSupabase();
  return json({
    ok: true,
    endpoint: '/api/report-health',
    method: 'POST',
    deployed: true,
    timestamp: new Date().toISOString(),
    received_body_length: raw.length,
    received_body_preview: raw.slice(0, 300),
    supabase,
  }, { status: 200 });
}
