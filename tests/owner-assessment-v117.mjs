import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {PDFDocument} from 'pdf-lib';
import {buildLandEvaluationExcelBuffer} from '../lib/landEvaluationExcel.js';
import {buildOwnerBriefPdf} from '../lib/ownerBriefPdf.mjs';
import {buildLandEvaluationPdfBuffer} from '../lib/landEvaluationPdf.mjs';
import {validateTemplate} from '../lib/reportTemplate.mjs';
import {assessReportQuality} from '../lib/reportQuality.mjs';
import {siteConflicts,readWorkValues,workingConflicts,updateWorkingFields} from '../lib/ownerAssessment.mjs';
import {comparableMetrics,marketDecision} from '../lib/marketDecision.mjs';
import {extractAssessmentAttachment} from '../lib/assessmentImport.mjs';
const names=['昭揚大方','寶欣住易','品坤禮寓','寶欣大家'];
const land='桃園市中壢區中運段150地號',product='兩房24–28坪、三房34–38坪',market='區域成交價格約45–50萬／坪。';
const advantages=['雙面臨路角地，住宅入口與車道較有配置彈性。','重劃區接既有中原商圈，可承接在地換屋。','體育園區後續建設可作區位介紹，效益仍看進度。'];
const resistances=['大型品牌接續推案，同總價客群將有更多選擇。','捷運尚未通車，短期銷售仍須靠現有機能與總價。'];
const cards=(cases)=>cases.map((name,i)=>`競案${i+1}｜${name}
建設公司：${['昭揚開發','寶欣建設','品坤建設','寶欣建設'][i]||'測試'}
競案等級：同區直接競案
案子規劃：${['2、3房、22–38坪','2房、21–28坪','2房、26–28坪','2、3、4房、27–43坪'][i]||'2房、22–26坪'}
屋齡：預售
成交期間：2026-01-01至2026-11-10
成交筆數：${[91,7,4,11][i]||1}筆
成交價格：${[46,45,50,45][i]||45}萬／坪
車位類型：坡道平面
車位價格：${i===0?215:210}萬／位
資訊來源：實價登錄
參考價值：僅為迴歸樣本
統計備註：115/${['08','06','07','07'][i]||'08'}開案；115年${[91,7,4,11][i]||1}筆；已售／總戶數待核對`).join('\n');
function fixture(cases=names){
 const report_text=`01｜案件摘要
配合業主：弘峻建設
調研日期：2026-11-10
目標地號：${land}
基地位置：中壢運動公園區段徵收
土地使用分區：商業區
基地面積：876.42坪
建蔽率：80%
容積率：320%
臨路條件：雙面臨路
初步市場定位：在地自住
建議價格：45萬／坪
建議產品：${product}
初步結論：先按在地換屋市場試算
本案快速結論：先按在地換屋市場試算
02｜基地基本條件
地號｜面積㎡｜面積坪｜備註
中運段150｜2897.26｜876.42｜委託圖示工作值
03｜法規與量體初判
土地使用分區：商業區
建蔽率：80%
容積率：320%
04｜臨路條件與基地四向現況
臨路條件：雙面臨路
東向｜後興路二段（15米）｜正面可規劃住宅入口
南向｜福吉路（10米）｜可研究車道位置
西向｜臨地（145地號）｜日後有鄰地開發可能
北向｜臨地（149地號）｜規劃需留採光
05｜生活圈與市場定位
交通通勤：臺鐵中壢站；捷運綠線延伸尚未通車。
生活機能：中壢後站及中原商圈。
公共建設：中壢運動公園區段徵收；大型建設依實際進度。
區域條件：新興街廓接既有生活圈。
市場定位：在地首換。
06｜學區與里別
里別：後寮里
基礎教育學區：普仁、龍岡國小自由學區（工作值）
中等教育學區：龍興國中（工作值）
備註：實際鄰別未核對
07｜目標客群判斷
在地自住家庭
08｜競案分級與市場行情
${cards(cases)}
市場行情總結：${market}
09｜價格預判
二樓以上住宅：
建議成交價格：45萬／坪
店面：
建議成交價格：50萬／坪
坡道平面車位：
建議成交價格：210萬／位
價格判斷摘要：人工工作值，未獨立核實。
10｜產品規劃建議
兩房產品：
建議坪數：24–28坪
對應客群：首購
總價控制：按工作值試算
規劃理由：控制總價
三房產品：
建議坪數：34–38坪
對應客群：換屋
總價控制：按工作值試算
規劃理由：自住需求
不建議產品：過大坪數
11｜銷售優勢與抗性
銷售優勢：
${advantages.map((x,i)=>i+1+'. '+x).join('\n')}
銷售抗性：
${resistances.map((x,i)=>i+1+'. '+x).join('\n')}
12｜結論
接案價值：在地自住
市場定位：區域首換
建議產品：${product}
建議價格：45萬／坪
主要抗性：競案供給
下一步建議：複核道路與學區
最終結論：先按在地換屋市場試算。`;
 const working=updateWorkingFields({},Object.entries({area:'876.42坪',zoning:'商業區',coverage:'80%',far:'320%',residentialPrice:'45萬／坪',shopPrice:'50萬／坪',parkingPrice:'210萬／位'}).map(([field,value])=>({field,value,source:'使用者完成版，測試輸入'})),{actor:'test'});
 return {report_id:'fixture-v117',client:'弘峻建設',land_number:land,research_date:'2026-11-10',report_text,summary:{_owner_brief:{version:'1.17.0',market,product,advantages,resistances},_working_fields:working}};
}
const p=fixture();
assert.deepEqual(validateTemplate(p.report_text),[]);
await assert.rejects(()=>buildOwnerBriefPdf({...p,report_text:'不完整'}),/欄位尚未齊全/);
assert.deepEqual(workingConflicts(p.summary._working_fields,p.report_text),[]);
assert.equal(workingConflicts(p.summary._working_fields,p.report_text.replace('建議成交價格：45','建議成交價格：49'))[0].working,'45萬／坪');
const base=readWorkValues(p.report_text);
assert.match(base.west,/145/);assert.match(base.north,/149/);
assert.ok(siteConflicts({...base,road:'雙面臨路，後興路一段、福吉路'}).some(v=>v.includes('路段')));
assert.ok(siteConflicts(base).some(v=>v.includes('鄰別')));
assert.equal(assessReportQuality(p).status,'preliminary');
const rows=Array.from({length:91},(_,i)=>({id:'T'+i,projectId:'A',date:'2026-08-01',revision:'2026-08-02',eligible:true,status:'active',saleType:'presale',use:'residential',floor:3,parkingKind:'ramp_flat',parkingCount:1,total:1310,area:32,parkingTotal:210,parkingArea:7}));
const metrics=comparableMetrics(rows,'2026-11-10',{totalResidential:96,projectId:'A',historyComplete:true});
assert.equal(metrics.calendarYear.bySaleType.presale.residentialSamples,91);
assert.equal(metrics.calendarYear.bySaleType.presale.residentialMean,44);
assert.equal(metrics.sold,null);assert.equal(metrics.salesRate,null);
const fact={id:'p',subject:'中運段150',source:'fixture',evidenceStatus:'source_checked',applicable:true,phase:'future'};
const point={factId:'p',kind:'advantage',category:'future',buyerImpact:'預期接駁',intentImpact:'對未來有興趣',salesImpact:'僅定位',copy:advantages[2]};
assert.equal(marketDecision({facts:[fact],points:[point]}).advantages.length,0);
assert.equal(marketDecision({facts:[fact],points:[{...point,realizedPriceImpact:false}]}).advantages.length,1);
for(const cases of [names,names.slice(0,2),[...names,'第五案測試']]){
 const x=fixture(cases),bytes=await buildLandEvaluationExcelBuffer(x),book=new ExcelJS.Workbook();
 await book.xlsx.load(bytes);
 const s=book.worksheets[0],price=19+cases.length;
 cases.forEach((name,i)=>assert.equal(s.getCell('C'+(19+i)).text,name));
 assert.equal(s.getCell('E19').text,'2、3房');assert.equal(s.getCell('F19').text,'22-38坪');
 assert.match(s.getCell('D'+price).text,/45.*人工工作值/);
 assert.match(s.getCell('H'+price).text,/50.*人工工作值/);
 assert.match(s.getCell('H'+(price+1)).text,/210.*人工工作值/);
 assert.equal(s.getImages().length,0);
 if(cases===names){
  const pdf=await buildOwnerBriefPdf(x);
  assert.equal((await PDFDocument.load(pdf)).getPageCount(),1);
  const input=await extractAssessmentAttachment(Buffer.from(bytes),'fixture.xlsx');
  assert.equal(input.landNumber,land);assert.equal(input.candidates.find(v=>v.field==='residentialPrice')?.status,'unknown');
  const importedPdf=await extractAssessmentAttachment(pdf,'fixture.pdf');
  assert.match(importedPdf.excerpt,/昭揚/);
  if(process.env.OWNER_V117_OUTPUT){
   const output=process.env.OWNER_V117_OUTPUT;await mkdir(output,{recursive:true});
   await writeFile(output+'/zhongyun-150.xlsx',bytes);
   await writeFile(output+'/zhongyun-150-brief.pdf',pdf);
   await writeFile(output+'/zhongyun-150-full.pdf',await buildLandEvaluationPdfBuffer(x));
  }
 }
}
for(const id of ['fulin192','lilin239','caoxin195']){
 const {payload}=JSON.parse(await readFile(new URL('./fixtures/historical-acceptance/'+id+'.json',import.meta.url),'utf8'));
 const result=await buildLandEvaluationExcelBuffer(payload);
 const b=new ExcelJS.Workbook();await b.xlsx.load(result);
 assert.match(b.worksheets[0].getCell('F3').text,new RegExp(id.replace(/\D/g,'')));
 assert.notEqual(assessReportQuality(payload).status,'ready_for_review');
}
console.log('中運150工作值、道路與學區衝突、成交與去化分離、2/4/5案匯出、PDF文字、泰山／林口／觀音歷史資料回歸通過。');

const {POST:saveReport}=await import('../app/api/reports/route.js');
const {reportForOutput}=await import('../lib/reportData.mjs');
const originalFetch=globalThis.fetch;
const environment=['LAND_ACCESS_CONTROL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
const previousEnv=Object.fromEntries(environment.map(k=>[k,process.env[k]]));
process.env.LAND_ACCESS_CONTROL='enabled';process.env.SUPABASE_URL='https://isolated.example';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only';
const submitted=reportForOutput(p);
const member={user_id:'00000000-0000-0000-0000-000000000001',role:'member',status:'active'};
const item={report_id:p.report_id,client:p.client,land_number:p.land_number,research_date:p.research_date,owner_id:member.user_id};
let dbRow=null,writes=0;
globalThis.fetch=async (url,opts={})=>{
 const u=new URL(url);assert.equal(u.origin,'https://isolated.example');
 if(u.pathname==='/auth/v1/user')return Response.json({id:member.user_id,email:'fixture@example.com',email_confirmed_at:'2026-11-10'});
 if(u.pathname==='/rest/v1/land_members')return Response.json([member]);
 if(u.pathname==='/rest/v1/land_cases')return Response.json([item]);
 if(u.pathname==='/rest/v1/reports')return Response.json(dbRow?[dbRow]:[]);
 if(u.pathname==='/rest/v1/rpc/land_working_guard_version')return Response.json('1');
 if(u.pathname==='/rest/v1/rpc/land_save_report'){
  const body=JSON.parse(opts.body);
  assert.equal(body.p_status,'preliminary');
  assert.equal(body.p_actor,member.user_id);
  assert.equal(body.p_payload.summary._working_base,dbRow?.summary._working_revision);
  dbRow=body.p_payload;delete dbRow.summary._working_base;writes++;
  return Response.json({operation:'updated'});
 }
 throw Error('Unexpected fixture call: '+u.pathname);
};
const request=body=>new Request('https://site.example/api/reports',{method:'POST',headers:{origin:'https://site.example','content-type':'application/json',cookie:'land_access=fixture'},body:JSON.stringify(body)});
try{
 const payload={...submitted,owner_brief:p.summary._owner_brief,working_fields:[{field:'residentialPrice',value:'45萬／坪',source:'人工確認'}]};
 let r=await saveReport(request(payload));assert.equal(r.status,201);assert.equal((await r.json()).verified,true);
 const firstRevision=dbRow.summary._working_revision;
 assert.equal(dbRow.summary._working_fields.residentialPrice.status,'manual');
 r=await saveReport(request({...submitted,report_text:submitted.report_text.replaceAll('45萬／坪','49萬／坪'),summary:{...submitted.summary,price:'49萬／坪'}}));
 assert.equal(r.status,409);assert.equal((await r.json()).conflicts[0].working,'45萬／坪');
 assert.equal(writes,1);assert.equal(dbRow.summary._working_revision,firstRevision);
 r=await saveReport(request({...submitted,owner_brief:p.summary._owner_brief,working_fields:[{field:'residentialPrice',value:'45萬／坪',source:'覆核來源'}]}));
 assert.equal(r.status,200);assert.notEqual(dbRow.summary._working_revision,firstRevision);
 assert.equal(dbRow.summary._working_fields.residentialPrice.history[0].source,'人工確認');
}finally{
 globalThis.fetch=originalFetch;
 for(const key of environment){if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key];}
}
console.log('既有 POST /api/reports：模擬登入、RPC 儲存讀回、拒絕覆寫及歷史保留通過。');
