import {validateTemplate} from './reportTemplate.mjs';
import {auditFacilityResearch} from './facilityResearchAudit.mjs';
export const RESEARCH_PROCESS_VERSION='2.0';
// Progress is derived from audited evidence, never caller-supplied completed flags.
export function assessResearchProgress(report={},audit={}) {
 const e=report.research_evidence||report.summary?._research_evidence||{};
 const claims=audit.claims||[], verified=f=>claims.some(c=>c.field===f&&c.status==='已核實');
 const regionMissing=auditFacilityResearch(e.facility_research,(Array.isArray(e.facility_research?.categories)?e.facility_research.categories:[]).map(r=>r?.text||'').join('\n'),claims,report.research_date);
 const groups=audit.comparables||[];
 const manual=(Array.isArray(e.claims)?e.claims:[]).flatMap(c=>(Array.isArray(c?.sources)?c.sources:[]).filter(s=>s?.observation&&/^[a-f0-9]{64}$/.test(s.observation.sha256||'')&&String(s.observation.locator||'').length>0&&String(s.raw_value||'').length>=12).map(s=>({field:c?.field,url:s.url,observation:s.observation,status:'已記錄查閱，待人工覆核；不是伺服器已核實'})));
 const stages=[
  ['base','基地與法規',['location','area','zoning','coverage','far','road','village','elementary_school','junior_school'].every(verified),'補齊本宗地官方資料、適用版本及行政學區'],
  ['region','區域環境',Boolean(e.facility_research)&&regionMissing.length===0,'補齊七類設施、交通、建設及環境證據'],
  ['cases','競案選擇',groups.length>0&&(e.comparables||[]).every(g=>g.case_name&&g.market_scope?.project_id&&g.market_scope?.market_type),'逐案記錄身分、交易類型與保留理由'],
  ['transactions','成交統計',Boolean(audit.transactions?.calculation_complete)&&groups.length>0&&groups.every(g=>g.calculation_complete),'先半年，不足再另列一年；補齊逐筆資料與排除紀錄'],
  ['valuation','價格與產品',audit.pricing_assessment?.complete===true,'以可比成交及基地條件提出初估，不以開價或試算代替'],
  ['editorial','業主稿',Boolean(report.report_text)&&!validateTemplate(report.report_text).length&&!/不(?:以|沿用)\d+(?:\.\d+)?萬|壓力測試|驗收瀏覽器|工具呼叫|資料庫/.test(report.report_text),'保留固定欄位，移除內部檢討與工具紀錄'],
 ];
 let previous=true;
 const result=stages.map(([id,label,complete,next])=>{const status=complete?'complete':previous?'incomplete':'blocked';previous=previous&&complete;return {id,label,status,next:complete?'':next};});
 result.push({id:'delivery',label:'網頁與檔案實測',status:'requires_live_test',next:'實際開網頁、下載、開檔並對照內容；自填通過旗標不算驗收'});
 return {version:RESEARCH_PROCESS_VERSION,stages:result,next_stage:result.find(s=>s.status!=='complete')?.id,eligible_for_owner_review:previous&&audit.source_verification_complete===true&&audit.report_quality?.status==='ready_for_review',manual_observations:manual,database_written:false};
}
export function checkpointKey(report) {
 if(!report?.report_id||!report?.land_number)throw Error('保存檢查點須有案件編號與地號');
 return 'land-research-v2:'+JSON.stringify([report.report_id,report.land_number]);
}
