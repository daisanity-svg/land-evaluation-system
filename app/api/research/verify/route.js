import { auditResearchEvidence } from '../../../../lib/researchEvidence.mjs';
export const runtime='nodejs';
export async function POST(request) {
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=='object')return Response.json({success:false,error:'請提供核實紀錄JSON'},{status:400});
  const audit=auditResearchEvidence(body.research_evidence,{land_number:body.land_number,research_date:body.research_date,report_text:body.report_text});
  return Response.json({success:audit.present&&!audit.errors.length,database_written:false,...audit},{status:audit.errors.length?422:200,headers:{'Cache-Control':'no-store'}});
}
