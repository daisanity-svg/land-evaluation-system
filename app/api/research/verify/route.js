import { verifyResearchRequest } from '../../../../lib/verifyResearchRequest.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request) {
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=='object'||Array.isArray(body))return Response.json({success:false,error:'請提供核實紀錄JSON',database_written:false},{status:400});
  const audit=await verifyResearchRequest(body);
  const success=audit.verification_status!=='invalid_input';
  return Response.json({success,...audit},{status:success?200:422,headers:{'Cache-Control':'no-store'}});
}
