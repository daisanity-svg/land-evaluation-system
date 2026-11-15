// A labelled field is authoritative even when it explicitly says unknown.
// Never replace it with a number found in another chapter or a competitor.
import {fieldBlock} from './reportFields.mjs';
import {calculateTransactions} from './researchEvidence.mjs';
export function reportSections(text='') {
 const out={},matches=[...String(text).matchAll(/^\s*(\d{2})[｜|][^\n]+$/gm)];
 matches.forEach((m,i)=>out[m[1]]=text.slice(m.index+m[0].length,matches[i+1]?.index||text.length).trim());return out;
}
export function labelledValue(text,labels) {
 for(const label of Array.isArray(labels)?labels:[labels]) {
  const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const m=String(text||'').match(new RegExp('^[ \\t]*'+escaped+'[ \\t]*[：:][ \\t]*([^\\n]*)','m'));
  if(m)return m[1].trim()||fieldBlock(text,label)||'待複核';
 }return '';
}
export function canonicalSummary(text='',form={}) {
 const s=reportSections(text),source=form.summary||{},first=s['01']||text;
 const pick=(labels,key,fallback='待複核')=>labelledValue(first,labels)||source[key]||fallback;
 return {location:pick(['基地位置','標的位置'],'location'),land:pick(['目標地號','標的地號'],'land_number',form.landNumber||form.land_number||'待複核'),zone:pick(['土地使用分區','土地分區'],'zoning'),area:pick(['基地面積','合計面積'],'area'),road:pick(['臨路條件','臨路'],'road'),price:labelledValue(first,'建議價格')||labelledValue((s['09']||'').split(/店面[：:]/)[0],'建議成交價格')||source.price||'待複核',product:labelledValue(first,'建議產品')||labelledValue(s['10'],'建議產品')||source.product||'待複核',conclusion:labelledValue(s['12'],['最終結論','結論'])||pick(['初步結論'],'conclusion')};
}
export function researchBlocked(text='') {
 const s=reportSections(text);if(!s['01'])return false;
 return [[['基地位置','標的位置'],'01'],[['基地面積','合計面積'],'01'],[['土地使用分區','土地分區'],'03'],[['建蔽率'],'03'],[['容積率'],'03'],[['臨路條件','臨路'],'04']].some(([keys,id])=>{const v=labelledValue(s[id],keys)||labelledValue(s['01'],keys);return !v||/待複核|待確認|待核|尚未|未完成|無法|未核實/.test(v);});
}
export function reportForOutput(report={}) {
 let text=String(report.report_text||'');
 // Preserve the original reasoning. Change only an unsupported decision phrase,
 // including the quick-summary prose, rather than deleting an entire paragraph.
 if(researchBlocked(text))text=text.replace(/^(初步結論|最終結論|本案快速結論)[：:]([^\n]*)/gm,(line,label,body)=>label+'：'+body.replace(/(?:目前選擇|建議)?暫緩[^，。；;,\n]*/g,'調研受阻，尚無法判斷開發可行性'));
 text=normalizeComparableOutput(text,report);
 const v=canonicalSummary(text,report);
 return {...report,report_text:text,summary:{...(report.summary||{}),location:v.location,land_number:v.land,zoning:v.zone,area:v.area,road:v.road,price:v.price,product:v.product,conclusion:v.conclusion}};
}
export function transactionCount(value='') {
 // Reject prose such as “591與樂居全歷史151筆…近半年待複核”.
 const m=String(value).trim().match(/^(?:(?:近半年|近一年|有效住宅|住宅成交|共)\s*)?(\d+)\s*筆/);
 return m?Number(m[1]):null;
}
export function statisticPresentation({count='',price='',period='',note=''}) {
 const n=transactionCount(count);
 const partial=/樣本|未確認|尚未|未齊|非全期|待複核|不足/.test(count+note);
 const annual=/^(?:樂居|平台)?(?:近)?一年(?:均價|住宅均價|平均)/.test(price.trim());
 return {count:n,countLabel:n===null?'期間筆數待複核':`${n}筆${partial?'樣本':''}`,partial,priceLabel:annual?'一年指標':/樣本/.test(price)?'樣本價':'',period};
}
export function priceCards(text='') {
 const marker=/^(二樓以上住宅|店面|坡道平面車位)[：:][ \t]*$/gm;
 const summary=fieldBlock(text,'價格判斷摘要');
 const body=text.split(/^價格判斷摘要[：:]/m)[0];
 const matches=[...body.matchAll(marker)];
 return {cards:matches.map((m,i)=>({title:m[1],lines:body.slice(m.index,matches[i+1]?.index||body.length).trim().split('\n')})),summary};
}

const caseHeading=/^\s*競案[一二三四五六七八九十0-9]+\s*[｜|]\s*([^\n]+)$/gm;
const nameKey = value => String(value||'').normalize('NFKC').replace(/\s+/g,'').trim();
export function normalizeComparableOutput(text, report) {
 const evidence=report.research_evidence||report.summary?._research_evidence;
 const groups=Array.isArray(evidence?.comparables)?evidence.comparables:[];
 const headings=[...String(text).matchAll(/^\s*(\d{2})[｜|][^\n]+$/gm)];
 const i=headings.findIndex(m=>m[1]==='08');
 if(i<0)return text;
 const start=headings[i].index+headings[i][0].length,end=headings[i+1]?.index??text.length;
 const reportDate=report.research_date||labelledValue(reportSections(text)['01'],'調研日期');
 const chapter=text.slice(start,end);
 const cases=[...chapter.matchAll(caseHeading)];
 if(!cases.length)return text;
 let out=chapter.slice(0,cases[0].index);
 for(const [index,m] of cases.entries()){
  const block=chapter.slice(m.index+m[0].length,cases[index+1]?.index??chapter.length);
  const matches=groups.filter(g=>nameKey(g?.case_name)===nameKey(m[1]));
  const g=matches.length===1?matches[0]:null;
  const scope=g?.market_scope;
  const audit=scope&&Array.isArray(g.transactions)&&g.transactions.length<=2000&&scope.date_to===reportDate?calculateTransactions(g.transactions,scope):null;
  const complete=audit?.population_complete&&!audit.errors.length;
  const prices=audit?.accepted.filter(t=>t.parking_type==='坡道平面'&&t.parking_spaces===1).map(t=>t.parking_price_wan)||[];
  const value=complete&&audit.valid_count?audit.average_unit_price+'萬／坪'+(audit.valid_count<3?'（有限樣本）':''):'未取得期間均價';
  const parking=complete&&prices.length?((Math.min(...prices)+Math.max(...prices))/2).toFixed(2).replace(/\.?0+$/,'')+'萬／位':'未取得同型車位統計';
  const fields={成交價格:value,車位價格:parking,成交筆數:complete?audit.valid_count+'筆':'期間筆數待複核'};
  if(complete)fields.成交期間=scope.date_from+' 至 '+scope.date_to;
  let body=block.replace(/^[ \t]*(成交價格|車位價格|成交筆數|住宅成交筆數|近半年有效成交筆數|成交期間)[：:].*$/gm,(line,label)=>label==='成交期間'&&!complete?line:'');
  let split=body.search(/^(?:市場行情總結|市場行情|區域行情|本章結論)[：:]/m);
  if(split<0)split=body.length;
  out+=m[0]+'\n'+body.slice(0,split).trim()+'\n'+Object.entries(fields).map(([k,v])=>k+'：'+v).join('\n')+'\n'+body.slice(split);
 }
 return text.slice(0,start)+out+text.slice(end);
}
