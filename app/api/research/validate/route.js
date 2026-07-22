import { evaluateResearchQuality } from '../../../../lib/researchQualityGate.mjs';

export const runtime = 'nodejs';

function invalidJsonResponse() {
  return Response.json(
    { accepted: false, error: '請提供合法 JSON 的結構化調研包。', result: null },
    { status: 400 }
  );
}

export async function POST(request) {
  let researchPackage;

  try {
    researchPackage = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  const result = evaluateResearchQuality(researchPackage);

  return Response.json(
    {
      accepted: result.valid,
      result,
      audit: {
        submitReport_called: false,
        supabase_written: false,
        production_modified: false,
      },
    },
    {
      status: result.valid ? 200 : 422,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
