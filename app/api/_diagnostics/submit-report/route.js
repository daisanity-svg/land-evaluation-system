import { POST as submitReportPost } from '../../gpt-submit-report/route.js';

export const runtime = 'nodejs';

function json(payload, init = {}) {
  return Response.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export async function GET() {
  const reportId = `diag-${Date.now()}`;
  const payload = {
    report_id: reportId,
    client: '系統自測',
    land_number: '測試段 1 地號',
    research_date: new Date().toISOString().slice(0, 10),
    summary: {
      location: '自動診斷測試位置',
      land_number: '測試段 1 地號',
      zoning: '測試分區',
      area: '測試面積',
      road: '測試臨路',
      price: '測試價格',
      product: '測試產品',
      conclusion: '測試結論',
    },
    report_text: `01｜案件摘要\n配合業主：系統自測\n調研日期：${new Date().toISOString().slice(0, 10)}\n目標地號：測試段 1 地號\n基地位置：自動診斷測試位置\n\n12｜結論\n這是回傳系統自動診斷資料。`,
  };

  try {
    const request = new Request('https://land-evaluation-system.vercel.app/api/gpt-submit-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await submitReportPost(request);
    const result = await response.json().catch(() => null);

    return json({
      diagnostic: 'submit-report',
      passed: Boolean(result?.success || result?.ok || result?.saved),
      expected_report_id: reportId,
      endpoint_under_test: '/api/gpt-submit-report',
      aliases_expected_to_match: ['/api/submitHiyesReport', '/api/submitReport'],
      result,
    });
  } catch (error) {
    return json({
      diagnostic: 'submit-report',
      passed: false,
      error: error.message || 'Diagnostic failed.',
      expected_report_id: reportId,
    }, { status: 200 });
  }
}
