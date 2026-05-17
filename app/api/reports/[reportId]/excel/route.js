import { buildLandEvaluationExcelBuffer } from '../../../../../lib/landEvaluationExcel.js';

export const runtime = 'nodejs';

const RAW_SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseRestUrl() {
  if (!RAW_SUPABASE_URL) return '';
  return RAW_SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

function safeFileName(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '')
    .slice(0, 90);
}

async function fetchReport(reportId) {
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
  return { supabaseResponse, data };
}

export async function GET(_request, { params }) {
  try {
    if (!RAW_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Supabase environment variables are not configured.' }, { status: 500 });
    }

    const reportId = String(params.reportId || '').trim();
    if (!reportId) {
      return Response.json({ error: 'reportId is required.' }, { status: 400 });
    }

    const { supabaseResponse, data } = await fetchReport(reportId);
    if (!supabaseResponse.ok) {
      return Response.json({ error: 'Failed to fetch report.', detail: data }, { status: supabaseResponse.status });
    }
    if (!Array.isArray(data) || data.length === 0) {
      return Response.json({ error: 'Report not found.' }, { status: 404 });
    }

    const report = data[0];
    if (!report.report_text) {
      return Response.json({ error: 'Report has no report_text.' }, { status: 422 });
    }

    const buffer = await buildLandEvaluationExcelBuffer(report);
    const filename = safeFileName(`${report.client || '土地評估'}-${report.land_number || reportId}-土地評估簡表-${report.research_date || ''}.xlsx`);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename || `${reportId}.xlsx`)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Excel export failed.' }, { status: 500 });
  }
}
