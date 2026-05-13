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

export async function GET(_request, { params }) {
  try {
    if (!RAW_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        { error: 'Supabase environment variables are not configured.' },
        { status: 500 }
      );
    }

    const reportId = String(params.reportId || '').trim();
    if (!reportId) {
      return Response.json({ error: 'reportId is required.' }, { status: 400 });
    }

    const supabaseBaseUrl = getSupabaseRestUrl();
    const url = `${supabaseBaseUrl}/rest/v1/reports?report_id=eq.${encodeURIComponent(reportId)}&select=*`;
    const supabaseResponse = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: 'no-store',
    });

    const data = await supabaseResponse.json().catch(() => null);

    if (!supabaseResponse.ok) {
      return Response.json(
        { error: 'Failed to fetch report.', detail: data, supabase_path: '/rest/v1/reports' },
        { status: supabaseResponse.status }
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return Response.json({ error: 'Report not found.' }, { status: 404 });
    }

    return Response.json({ report: data[0] });
  } catch (error) {
    return Response.json({ error: error.message || 'Server error.' }, { status: 500 });
  }
}
