export const runtime = 'nodejs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function missingConfig() {
  return !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY;
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

    if (!report_id || !report_text) {
      return Response.json(
        { error: 'report_id and report_text are required.' },
        { status: 400 }
      );
    }

    const payload = {
      report_id,
      client: body.client || '',
      land_number: body.land_number || '',
      research_date: body.research_date || '',
      report_text,
    };

    const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
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

    if (!supabaseResponse.ok) {
      return Response.json(
        { error: 'Failed to save report.', detail: data },
        { status: supabaseResponse.status }
      );
    }

    return Response.json({ ok: true, report: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    return Response.json({ error: error.message || 'Server error.' }, { status: 500 });
  }
}
