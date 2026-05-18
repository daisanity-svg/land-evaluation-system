import { POST as gptSubmitPost } from '../../gpt-submit-report/route.js';
import { POST as reportsPost } from '../../reports/route.js';
import { POST as submitHiyesPost } from '../../submitHiyesReport/route.js';
import { POST as submitReportPost } from '../../submitReport/route.js';
import { POST as submitHiyesKebabPost } from '../../submit-hiyes-report/route.js';
import { buildLandEvaluationExcelBuffer } from '../../../../lib/landEvaluationExcel.js';

export const runtime = 'nodejs';

function ok(body){ return Boolean(body?.success || body?.ok || body?.saved); }
function j(payload){ return Response.json(payload,{headers:{'Cache-Control':'no-store'}}); }

function payload(id){
  return {
    report_id:id,
    client:'系統自測',
    land_number:'測試段1地號',
    research_date:new Date().toISOString().slice(0,10),
    summary:{location:'測試位置',land_number:'測試段1地號',zoning:'住宅區',area:'100坪',road:'10米路',price:'住宅48～52萬/坪；店面60～70萬/坪；車位180～220萬/位',product:'兩房、三房',conclusion:'測試通過'},
    report_text:'01｜案件摘要\n配合業主：系統自測\n調研日期：2026-05-19\n目標地號：測試段1地號\n基地位置：測試位置\n土地使用分區：住宅區\n基地面積：100坪\n建蔽率：50%\n容積率：200%\n臨路條件：10米路\n建議價格：二樓以上住宅48～52萬／坪；店面60～70萬／坪；坡道平面車位180～220萬／位。\n建議產品：兩房26～30坪、三房36～42坪。\n\n08｜競案分級與市場行情\n競案一｜測試競案\n案子規劃：2～3房，26～42坪。\n屋齡：預售案。\n成交筆數：近一年10筆。\n成交價格：48～52萬／坪，車位約180～220萬／位。\n\n09｜價格預判\n二樓以上住宅：\n建議成交價格：48～52萬／坪\n店面：\n建議成交價格：60～70萬／坪\n坡道平面車位：\n建議成交價格：180～220萬／位\n\n11｜銷售優勢與抗性\n銷售優勢：\n1. 測試優勢。\n銷售抗性：\n1. 測試抗性。\n\n12｜結論\n測試結論。'
  };
}

async function call(name, handler, id){
  const req=new Request('https://land-evaluation-system.vercel.app/api/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload(id))});
  const res=await handler(req);
  const body=await res.json().catch(()=>null);
  return {name,http_status:res.status,success:ok(body),status:body?.status||null,error:body?.error||null,detail:body?.detail||null};
}

async function testExcel(){
  try{const b=Buffer.from(await buildLandEvaluationExcelBuffer(payload('diag-excel')));return {success:b.length>5000 && b.slice(0,2).toString()==='PK',size:b.length,magic:b.slice(0,2).toString()};}
  catch(e){return {success:false,error:e.message};}
}

export async function GET(){
  const base='diag-full-'+Date.now();
  const endpoints=[['gpt-submit-report',gptSubmitPost],['reports',reportsPost],['submitHiyesReport',submitHiyesPost],['submitReport',submitReportPost],['submit-hiyes-report',submitHiyesKebabPost]];
  const submit=[];
  for(const [name,handler] of endpoints){ submit.push(await call(name,handler,base+'-'+name)); }
  const excel=await testExcel();
  return j({diagnostic:'full-submit-and-excel',passed:submit.every(x=>x.success)&&excel.success,submit,excel});
}
