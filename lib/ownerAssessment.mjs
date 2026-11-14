import { labelledValue, reportSections } from './reportData.mjs';

export const OWNER_ASSESSMENT_VERSION='1.17.0';
const sectionFields={
 location:['01','基地位置'],area:['01','基地面積'],zoning:['03','土地使用分區'],
 coverage:['03','建蔽率'],far:['03','容積率'],road:['04','臨路條件'],
 village:['06','里別'],schoolPrimary:['06','基礎教育學區'],schoolSecondary:['06','中等教育學區'],
 product:['01','建議產品'], market:['08','市場行情總結']
};
const prices={residentialPrice:'二樓以上住宅',shopPrice:'店面',parkingPrice:'坡道平面車位'};
const directions={east:'東向',west:'西向',south:'南向',north:'北向'};
export const WORK_FIELDS=Object.freeze([...Object.keys(sectionFields),...Object.keys(prices),...Object.keys(directions),'neighborhood']);
export const FIELD_STATUS=Object.freeze({manual:'人工工作值',source_checked:'已查來源值',verified:'正式核實值',unknown:'尚未確認'});
const clean=v=>String(v??'').normalize('NFKC').replace(/\s+/g,'').trim();
function comparableValue(field,value){
 let v=clean(value).replace(/[(（]人工工作值[)）]/g,'').replace(/坪數/g,'坪');
 if(Object.hasOwn(prices,field))v=v.replace(/萬(?:元)?[\/／](?:坪|位)$/,'');
 return v;
}
export function readWorkValues(reportText){
 const s=reportSections(reportText);
 return {...Object.fromEntries(Object.entries(sectionFields).map(([k,[id,label]])=>[k,labelledValue(s[id],label)])),
 ...Object.fromEntries(Object.entries(prices).map(([k,label])=>[k,labelledValue((s['09']||'').match(new RegExp('^'+label+'[：:]\\s*\\n([^\\n]+)','m'))?.[1],'建議成交價格')])),
 ...Object.fromEntries(Object.entries(directions).map(([k,label])=>[k,(s['04']||'').match(new RegExp('^\\s*'+label+'[｜|]([^｜|\\n]+)','m'))?.[1]?.trim()||''])),
 neighborhood:labelledValue(s['06'],'鄰別')};
}
export function updateWorkingFields(previous={},changes=[],{actor,now=new Date().toISOString()}={}){
 if(!actor||!Array.isArray(changes)||changes.length>WORK_FIELDS.length)throw Error('人工修改缺少身分或欄位不正確');
 const out={...previous};const seen=new Set();
 for(const change of changes){
  const {field,value,source,reason,locked=true}=change;
  if(!WORK_FIELDS.includes(field)||seen.has(field)||typeof locked!=='boolean'||typeof value!=='string'||!value.trim()||value.length>300||/[\r\n]/.test(value)||typeof source!=='string'||!source.trim()||source.length>300)throw Error('人工修改欄位、工作值或來源不正確');
  if(reason!==undefined&&(typeof reason!=='string'||!reason.trim()||reason.length>300))throw Error('採用理由不正確');
  seen.add(field);
  const next={value:value.trim(),source:source.trim(),...(reason?{reason:reason.trim()}:{}),status:'manual',locked,versionDate:now,actor};
  const old=out[field];
  if(old&&['value','source','reason','locked','status'].every(k=>old[k]===next[k]))continue;
  const {history:_,...last}=old||{};
  out[field]={...next,history:old?[...(old.history||[]),last]:[]};
 }
 return out;
}
export function workingConflicts(fields,reportText){
 const values=readWorkValues(reportText);
 return Object.entries(fields||{}).filter(([field,entry])=>entry.locked&&comparableValue(field,entry.value)!==comparableValue(field,values[field])).map(([field,entry])=>({field,working:entry.value,proposed:values[field]||null}));
}
export function siteConflicts({road,east,north,south,west,schoolPrimary,neighborhood}={}){
 const result=[];
 const dirs=[east,south,west,north].filter(Boolean);
 const named=dirs.filter(v=>!/^臨(?:地|房)/.test(v)&&/[路街道]/.test(v));
 if(/雙面臨路/.test(road||'')&&dirs.length===4&&named.length!==2)result.push('雙面臨路與四向道路數不一致');
 for(const value of named){
  const match=value.match(/([\p{Script=Han}]+[路街道])([一二三四五六七八九十0-9]+)段/u);
  if(!match)continue;
  const sections=[...String(road||'').matchAll(new RegExp(match[1]+'([一二三四五六七八九十0-9]+)段','g'))].map(m=>m[1]);
  if(sections.length&&!sections.includes(match[2]))result.push(match[1]+'路段與四向現況不一致');
 }
 if(/自由學區/.test(schoolPrimary||'')&&!neighborhood)result.push('自由學區尚未對到實際鄰別');
 return [...new Set(result)];
}

export function normalizeOwnerBrief(brief,reportText){
 if(!brief||brief.version!==OWNER_ASSESSMENT_VERSION)throw Error('業主簡表版本不符');
 const values=readWorkValues(reportText);
 const out={version:OWNER_ASSESSMENT_VERSION};
 for(const [key,max] of [['market',100],['product',90]]){
  const v=brief[key];
  if(typeof v!=='string'||!v.trim()||v.length>max||/[\r\n]/.test(v)||clean(v)!==clean(values[key]))throw Error('業主簡表與正文不一致：'+key);
  out[key]=v.trim();
 }
 const section=reportSections(reportText)['11']||'';
 const used=new Set();
 for(const [key,label] of [['advantages','銷售優勢'],['resistances','銷售抗性']]){
  const list=brief[key];
  const body=section.split(label+'：')[1]?.split('銷售抗性：')[0]||'';
  if(!Array.isArray(list)||list.length>4)throw Error('業主簡表優劣勢最多各四項');
  out[key]=list.map(v=>{
   if(typeof v!=='string'||!v.trim()||v.length>115||/[\r\n]/.test(v)||/待查|待複核|查無資料/.test(v)||used.has(clean(v))||!clean(body).includes(clean(v)))throw Error('優劣勢重複、未見於正文或缺乏可用內容');
   used.add(clean(v));return v.trim();
  });
 }
 return out;
}

// Apply only explicit, authenticated edits. Never resolve a conflicting
// research return by silently substituting a previously locked value.
export function applyConfirmedFields(report,changes){
 let text=report.report_text;
 const rewrite=(id,fn)=>{
  const re=new RegExp('(^'+id+'[｜|][^\\n]*\\n)([\\s\\S]*?)(?=^\\d{2}[｜|]|(?![\\s\\S]))','m');
  if(!re.test(text))throw Error('缺少報告章節：'+id);
  text=text.replace(re,(_m,header,body)=>header+fn(body));
 };
 const label=(id,key,val,insert=false)=>rewrite(id,body=>{
  const re=new RegExp('^[ \\t]*'+key+'[ \\t]*[：:][^\\n]*$','m');
  if(!re.test(body)&&!insert)throw Error('缺少欄位：'+id+'／'+key);
  return re.test(body)?body.replace(re,()=>key+'：'+val):key+'：'+val+'\n'+body;
 });
 const summary={...report.summary};
 const summaryKeys={location:'location',area:'area',zoning:'zoning',road:'road',product:'product'};
 for(const {field,value} of changes){
  const val=value.trim();
  if(Object.hasOwn(prices,field)){
   const m=val.normalize('NFKC').match(/^(\d+(?:\.\d+)?)(?:萬(?:元)?\/(坪|位))?$/);
   const unit=field==='parkingPrice'?'位':'坪';
   if(!m||!(Number(m[1])>0)||m[2]&&m[2]!==unit)throw Error('採價須為正數，且單位須符合欄位：'+field);
   const adopted=m[1]+'萬／'+unit+'（人工工作值）';
   rewrite('09',body=>{
    const re=new RegExp('^('+prices[field]+'[：:][ \\t]*\\n[ \\t]*建議成交價格[：:])[^\\n]*','m');
    if(!re.test(body))throw Error('缺少採價欄位：'+field);
    return body.replace(re,(_m,prefix)=>prefix+adopted);
   });
   if(field==='residentialPrice'){
    label('01','建議價格',adopted);summary.price=adopted;
   }
  }else if(Object.hasOwn(directions,field)){
   rewrite('04',body=>{
    const re=new RegExp('^([ \\t]*'+directions[field]+'[｜|])[^｜|\\n]*([^\\n]*)','m');
    if(!re.test(body)||/[｜|]/.test(val))throw Error('四向現況格式不正確：'+field);
    // The former sales-impact wording must be reviewed against the new fact.
    return body.replace(re,(_m,prefix)=>prefix+val+'｜待重新評估銷售影響');
   });
  }else if(field==='neighborhood')label('06','鄰別',val,true);
  else if(Object.hasOwn(sectionFields,field)){
   // A multi-parcel total must still agree with chapter 02, which is audited separately.
   const [id,key]=sectionFields[field];
   const adopted=['village','schoolPrimary','schoolSecondary'].includes(field)&&!val.includes('人工工作值')?val+'（人工工作值）':val;
   label(id,key,adopted);
   if(['zoning','coverage','far','road'].includes(field))label('01',key,val);
   if(field==='product')label('12',key,val);
   if(summaryKeys[field])summary[summaryKeys[field]]=val;
  }
 }
 if(changes.some(c=>Object.hasOwn(prices,c.field))){
  const values=readWorkValues(text);
  label('12','建議價格',Object.entries(prices).map(([k,title])=>title+values[k]).join('；'));
 }
 return {...report,report_text:text,summary};
}
