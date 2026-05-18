export const runtime = 'nodejs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const HEADERS = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function json(data) {
  return Response.json(data, { status: 200, headers: HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}

function baseUrl() {
  return String(SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

function pick(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') || '';
}

async function readBody(request) {
  const raw = await request.text();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed.data || parsed.arguments || parsed.input || parsed.params || parsed.payload || parsed;
  } catch {
    return { report_text: raw };
  }
}

function success(payload, mode = 'saved') {
  return json({
    success: true,
    ok: true,
    saved: true,
    status: mode,
    message: '報告已成功送回土地評估系統。',
    report_id: payload.report_id,
    client: payload.client,
    land_number: payload.land_number,
    research_date: payload.research_date
  });
}

async function save(path, method, payload) {
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text().catch(() => '');
  return { response, text };
}

export async function POST(request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return json({ success: false, ok: false, saved: false, status: 'missing_config', message: 'Supabase config missing.' });
    }

    const body = await readBody(request);
    const payload = {
      report_id: String(pick(body.report_id, body.reportId, body.id)).trim(),
      client: String(pick(body.client, body.client_name, body.clientName)).trim(),
      land_number: String(pick(body.land_number, body.landNumber, body.land_no, body.landNo)).trim(),
      research_date: String(pick(body.research_date, body.researchDate, body.date)).trim(),
      report_text: String(pick(body.report_text, body.reportText, body.report, body.text)).trim()
    };

    if (body.summary && typeof body.summary === 'object') payload.summary = body.summary;

    if (!payload.report_id || !payload.report_text) {
      return json({ success: false, ok: false, saved: false, status: 'missing_required_fields', message: 'report_id and report_text are required.', report_id: payload.report_id });
    }

    let result = await save('/rest/v1/reports', 'POST', payload);
    if (!result.response.ok && result.text.toLowerCase().includes('summary')) {
      delete payload.summary;
      result = await save('/rest/v1/reports', 'POST', payload);
    }

    if (!result.response.ok && (result.text.includes('23505') || result.text.toLowerCase().includes('duplicate key'))) {
      await save(`/rest/v1/reports?report_id=eq.${encodeURIComponent(payload.report_id)}`, 'PATCH', payload);
      return success(payload, 'updated');
    }

    if (!result.response.ok) {
      return json({ success: false, ok: false, saved: false, status: 'supabase_save_failed', message: 'Supabase save failed.', report_id: payload.report_id, detail: result.text.slice(0, 500) });
    }

    return success(payload);
  } catch (error) {
    return json({ success: false, ok: false, saved: false, status: 'server_error', message: error.message || 'Server error.' });
  }
}
