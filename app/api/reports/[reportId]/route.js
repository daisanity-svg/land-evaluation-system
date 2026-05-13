export const runtime = 'nodejs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(_request, { params }) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        { error: 'Supabase environment variables are not configured.' },
        { status: 500 }
      );
    }

    const reportId = String(params.reportId || '').trim();
    if (!reportId) {
      return Response.json({ error: 'reportId is required.' }, { status: 400 });
    }

    const url = `${SUPABASE_URL}/rest/v1/reports?report_id=eq.${encodeURIComponent(reportId)}&select=*`;
    const supabaseResponse = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: 'no-store',
    });

    const data = await supabaseResponse.json();

    if (!supabaseResponse.ok) {
      return Response.json(
        { error: 'Failed to fetch report.', detail: data },
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
