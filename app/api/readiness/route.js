export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  let ready = false;
  try {
    const base = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/,'').replace(/\/rest\/v1$/i,'');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(base && key) {
      const response=await fetch(base+'/rest/v1/reports?select=report_id&limit=1',{
        headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(8000)
      });
      if(response.ok) { const rows=await response.json(); ready=Array.isArray(rows); }
    }
  } catch {}
  return Response.json({ready,message:ready?'報告儲存服務可用。':'報告儲存服務暫時無法使用；草稿仍保留在此瀏覽器，請稍後重試。'},
    {status:ready?200:503,headers:{'Cache-Control':'no-store'}});
}
