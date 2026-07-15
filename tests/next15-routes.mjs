import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const report = {
  report_id: 'next15-route-test',
  client: '測試業主',
  land_number: '測試段1地號',
  research_date: '2026-07-15',
  summary: { conclusion: '測試結論' },
  report_text: '01｜案件摘要\n配合業主：測試業主\n目標地號：測試段1地號\n\n12｜結論\n測試結論',
  created_at: '2026-07-15T00:00:00.000Z',
  updated_at: '2026-07-15T00:00:00.000Z',
};

const originalFetch = global.fetch;
global.fetch = async () => Response.json([report]);

try {
  const [{ GET: getReport }, { GET: getReportStatus }, { POST: exportExcel }] = await Promise.all([
    import('../app/api/reports/[reportId]/route.js'),
    import('../app/api/reports/[reportId]/status/route.js'),
    import('../app/api/reports/[reportId]/excel/route.js'),
  ]);

  const routeContext = { params: Promise.resolve({ reportId: report.report_id }) };

  const reportResponse = await getReport(null, routeContext);
  assert.equal(reportResponse.status, 200);
  assert.equal((await reportResponse.json()).report.report_id, report.report_id);

  const statusResponse = await getReportStatus(null, routeContext);
  assert.equal(statusResponse.status, 200);
  const statusBody = await statusResponse.json();
  assert.equal(statusBody.exists, true);
  assert.equal(statusBody.report_id, report.report_id);
  assert.equal(statusBody.has_report_text, true);
  assert.equal(statusBody.has_summary, true);

  const excelRequest = new Request('http://localhost/api/reports/next15-route-test/excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  const excelResponse = await exportExcel(excelRequest, routeContext);
  assert.equal(excelResponse.status, 200);
  assert.equal(
    excelResponse.headers.get('content-type'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  assert.ok((await excelResponse.arrayBuffer()).byteLength > 1_000);

  console.log('All Next.js 15 route compatibility tests passed.');
} finally {
  global.fetch = originalFetch;
}
