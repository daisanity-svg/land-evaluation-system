import { evaluateResearchQuality } from '../../../../lib/researchQualityGate.mjs';
import { buildResearchReportHandoff } from '../../../../lib/researchReportHandoff.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  let researchPackage;

  try {
    researchPackage = await request.json();
  } catch {
    return Response.json({ accepted: false, error: '請提供合法 JSON 的結構化調研包。' }, { status: 400 });
  }

  const gate = evaluateResearchQuality(researchPackage);
  const handoff = buildResearchReportHandoff(researchPackage);
  const eligible = gate.valid && handoff.eligible;

  if (!eligible) {
    return Response.json(
      {
        accepted: false,
        gate,
        blockers: [...gate.errors, ...handoff.blockers],
        handoff: null,
        audit: {
          submitReport_called: false,
          supabase_written: false,
          production_modified: false,
        },
      },
      { status: 422, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return Response.json(
    {
      accepted: true,
      gate,
      blockers: [],
      handoff: handoff.text,
      audit: {
        submitReport_called: false,
        supabase_written: false,
        production_modified: false,
      },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
