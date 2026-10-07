import { assessReportQuality } from '../../../../lib/reportQuality.mjs';
import { auditResearchEvidence } from '../../../../lib/researchEvidence.mjs';
import { verifySourcePages } from '../../../../lib/sourceVerifier.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request) {
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=='object')return Response.json({success:false,error:'請提供核實紀錄JSON'},{status:400});
  const sourceChecks=await verifySourcePages(body.research_evidence);
  const audit=auditResearchEvidence(body.research_evidence,{land_number:body.land_number,research_date:body.research_date,report_text:body.report_text},{sourceChecks});
  if(body.report_text)audit.report_quality=assessReportQuality(body,{sourceChecks});
  return Response.json({success:audit.present&&!audit.errors.length,database_written:false,...audit},{status:audit.errors.length?422:200,headers:{'Cache-Control':'no-store'}});
}

