import {guardUser,accessError,AccessError} from '../../../../lib/accessControl.mjs';
import {extractAssessmentAttachment} from '../../../../lib/assessmentImport.mjs';
export const runtime='nodejs';
export async function POST(request){
 try{
  if(!await guardUser(request,true))return Response.json({error:'附件讀取須啟用案件登入控管。'},{status:403});
  const length=Number(request.headers.get('content-length'));
  if(length>3750000)return Response.json({error:'附件超過容量上限。'},{status:413});
  const file=(await request.formData()).get('file');
  if(!file||typeof file==='string'||file.size>3500000)return Response.json({error:'請選擇 3.5 MB 以內的附件。'},{status:400});
  return Response.json(await extractAssessmentAttachment(Buffer.from(await file.arrayBuffer()),file.name),{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(error instanceof AccessError)return accessError(error);
  return Response.json({error:'附件無法解析：'+(error.message||'格式不符')},{status:422});
 }
}
