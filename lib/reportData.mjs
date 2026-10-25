// A labelled field is authoritative even when it explicitly says unknown.
// Never replace it with a number found in another chapter or a competitor.
import {fieldBlock} from './reportFields.mjs';
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
 return ['基地位置','基地面積'].some(key=>{const v=labelledValue(s['01'],key);return !v||/待複核|待確認|尚未|未完成|無法|未核實/.test(v);});
}
export function reportForOutput(report={}) {
 let text=String(report.report_text||'');
 if(researchBlocked(text))text=text.replace(/^(初步結論|最終結論)[：:][ \t]*暫緩[^\n]*/gm,'$1：調研受阻，尚無法判斷開發可行性。');
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
