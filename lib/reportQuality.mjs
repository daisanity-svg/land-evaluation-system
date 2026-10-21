import { auditResearchEvidence } from './researchEvidence.mjs';
import {fieldBlock} from './reportFields.mjs';
import {auditContent} from './reportContentAudit.mjs';
import {auditBaseConsistency,auditRecommendedPrice,auditDeclaredFacts} from './reportConsistency.mjs';
const unknown = /待複核|待確認|待謄本|尚未(?:確認|取得|核實|查明)|未能(?:確認|取得|核實|查明)|無法确认|無法確認|不能確認|無法取得/;
const line = (text,key) => fieldBlock(text,key);
function sections(text) { const out={};const matches=[...String(text||'').matchAll(/^\s*(\d{2})[｜|][^\n]+$/gm)];matches.forEach((m,i)=>{out[m[1]]=text.slice(m.index+m[0].length,matches[i+1]?.index||text.length);});return out; }
function price(value) { if(unknown.test(value))return '';const m=String(value).match(/(\d+(?:\.\d+)?)(?:\s*[～~－-]\s*(\d+(?:\.\d+)?))?\s*萬(?:元)?\s*[／/]\s*坪/);return m ? `${Number(m[1])}${m[2]?'～'+Number(m[2]):''}` : ''; }
export function assessReportQuality(report,options={}) {
  const text=String(report?.report_text||'');const s=sections(text);const missing=[];const conflicts=[];
  conflicts.push(...auditBaseConsistency(s,report.summary||{}));
  conflicts.push(...auditRecommendedPrice(s,report.summary||{}));
  conflicts.push(...auditDeclaredFacts(s,report.summary||{}));
  const required=[['土地分區',report.summary?.zoning||line(s['01'],'土地使用分區')],['基地面積',report.summary?.area||line(s['01'],'基地面積')],['臨路條件',report.summary?.road||line(s['04'],'臨路條件')],['建蔽率',line(s['03'],'建蔽率')],['容積率',line(s['03'],'容積率')],['里別',line(s['06'],'里別')],['國小學區',line(s['06'],'基礎教育學區')],['國中學區',line(s['06'],'中等教育學區')]];
  required.forEach(([key,value])=>{if(!value||unknown.test(value))missing.push(key);});
  for(const label of ['建蔽率','容積率']) {const a=line(s['01'],label),b=line(s['03'],label);const na=!unknown.test(a)&&a.match(/\d+(?:\.\d+)?\s*[%％]/)?.[0],nb=!unknown.test(b)&&b.match(/\d+(?:\.\d+)?\s*[%％]/)?.[0];if(na&&nb&&na.replace(/\s|％/g,x=>x==='％'?'%':'')!==nb.replace(/\s|％/g,x=>x==='％'?'%':''))conflicts.push(`${label}在摘要與法規章不一致`);}
  const residential=(s['09']||'').split(/店面\s*[：:]/)[0];const candidates=[['摘要',line(s['01'],'建議價格')],['八欄摘要',report.summary?.price||''],['價格預判',line(residential,'建議成交價格')],['結論',line(s['12'],'建議價格')]].map(([label,value])=>[label,price(value)]).filter(x=>x[1]);
  if(new Set(candidates.map(x=>x[1])).size>1)conflicts.push('住宅價格在摘要、價格預判或結論不一致');
  if(!price(line(residential,'建議成交價格')))missing.push('住宅成交價格');
  const cases=[...(s['08']||'').matchAll(/^\s*競案[一二三四五六七八九十0-9]+[｜|]/gm)];
  if(!cases.length||unknown.test(line(s['08'],'市場行情總結')))missing.push('競案成交與市場行情');
  // Content completeness is separate from source verification. Missing prose
  // remains a draft; it does not block saving or exporting historical reports.
  for (const [key,label] of [['交通動線','交通動線'],['生活機能','生活機能'],['公共建設','公共建設']]) {
    const value=fieldBlock(s['05'],key==='交通動線'?['交通動線','交通通勤']:[key]);
    if(!value||unknown.test(value))missing.push(label+'具體敘述');
  }
  const caseNames=[...(s['08']||'').matchAll(/^\s*競案[一二三四五六七八九十0-9]+[｜|]([^\n]+)/gm)].map(m=>m[1].trim());
  const market=line(s['08'],'市場行情總結');
  if(!caseNames.some(name=>market.includes(name)))missing.push('區域銷況須引用個案參考');
  const blocks=(s['08']||'').split(/^\s*競案[一二三四五六七八九十0-9]+[｜|]/m).slice(1);
  if(blocks.some(block=>!/(?:成交筆數|近半年成交|近一年成交)[：:]\s*(?:共)?\d+\s*筆/.test(block)||!price(line(block,'成交價格'))))missing.push('個案成交均價與筆數');
  const swot=s['11']||'';
  const advantage=swot.split(/銷售優勢\s*[：:]/)[1]?.split(/銷售抗性\s*[：:]/)[0]||'';
  const disadvantage=swot.split(/銷售抗性\s*[：:]/)[1]||'';
  for(const [label,block] of [['銷售優勢',advantage],['銷售抗性',disadvantage]]) {
    const items=[...block.matchAll(/^\s*(?:[一二三四五六七八九十]+[、.．]|[0-9]+[、.．)])\s*(.+)$/gm)].map(m=>m[1].trim()).filter(v=>!unknown.test(v)&&!/尚無.*(?:明顯|確認)|資料(?:不足|缺漏)|待(?:補|查)/.test(v));
    if(items.length!==3||new Set(items.map(v=>v.replace(/\s|[，。、；：]/g,''))).size!==3)missing.push(label+'須有三項具體依據');
  }
  const evidence=auditResearchEvidence(report.research_evidence||report.summary?._research_evidence,report,options);
  const content=auditContent(s,report.research_evidence||report.summary?._research_evidence||{},evidence.claims);
  missing.push(...content.missing);conflicts.push(...content.conflicts);
  conflicts.push(...evidence.errors);
  if(!evidence.review_record_complete)missing.push('核實紀錄與成交驗算');
  return {status:conflicts.length?'conflict':missing.length?'preliminary':'ready_for_review',missing_core_fields:[...new Set(missing)],conflicts,source_verification_complete:evidence.source_verification_complete&&!content.missing.length&&!conflicts.length,evidence_audit:evidence,label:conflicts.length?'內容有衝突':missing.length?'初評草稿｜核心資料待確認':'內容與核實紀錄齊全｜待最終審閱'};
}

