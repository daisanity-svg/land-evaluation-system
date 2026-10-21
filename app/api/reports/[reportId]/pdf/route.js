import { guardUser, AccessError, accessError } from '../../../../../lib/accessControl.mjs';
import { buildLandEvaluationPdfBuffer } from '../../../../../lib/landEvaluationPdf.mjs';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request) {
  try {
    await guardUser(request, true);
    const body = await request.json();
    if (!body || typeof body.report_text !== 'string') return Response.json({error:'請提供完整報告。'},{status:400});
    const bytes = await buildLandEvaluationPdfBuffer(body);
    const name = `${body.client || '土地評估'}_${body.land_number || '報告'}_${body.research_date || ''}.pdf`.replace(/[\\/:*?"<>|\r\n]/g,'-');
    return new Response(bytes,{headers:{'Content-Type':'application/pdf','Cache-Control':'no-store','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(name)}`}});
  } catch(error) {
    if(error instanceof AccessError)return accessError(error);
    return Response.json({error:error.message || 'PDF產生失敗。'},{status:422});
  }
}
