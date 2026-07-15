export const runtime = 'nodejs';

function config() {
  const rawUrl = process.env.SUPABASE_URL || '';
  return {
    baseUrl: rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

export async function GET(_request, { params }) {
  const routeParams = await params;
  const reportId = String(routeParams?.reportId || '').trim();
  if (!reportId) return Response.json({ exists: false, error: 'reportId is required.' }, { status: 400 });
  const { baseUrl, key } = config();
  if (!baseUrl || !key) return Response.json({ exists: false, report_id: reportId, error: 'Supabase is not configured.' }, { status: 500 });

  try {
    const response = await fetch(`${baseUrl}/rest/v1/reports?report_id=eq.${encodeURIComponent(reportId)}&select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return Response.json({ exists: false, report_id: reportId, error: 'Failed to query report.' }, { status: [401, 403].includes(response.status) ? response.status : 502 });
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return Response.json({ exists: false, report_id: reportId }, { status: 200 });
    return Response.json({
      exists: true,
      report_id: row.report_id,
      client: row.client || '',
      land_number: row.land_number || '',
      research_date: row.research_date || '',
      has_report_text: typeof row.report_text === 'string' && row.report_text.length > 0,
      report_text_length: typeof row.report_text === 'string' ? row.report_text.length : 0,
      has_summary: Boolean(row.summary && typeof row.summary === 'object'),
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ exists: false, report_id: reportId, error: 'Report query failed.' }, { status: 500 });
  }
}
