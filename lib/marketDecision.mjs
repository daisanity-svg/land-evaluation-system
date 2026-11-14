import {sourceKey} from './sourceVerifier.mjs';
// Pure calculations. Source verification stays in researchEvidence/sourceVerifier.
export const MARKET_STAGES=Object.freeze(['基地條件','生活圈','直接競案','替代區競爭','供給與銷況','客群','產品','價格','銷售優劣勢']);
const positive=n=>Number.isFinite(n)&&n>0;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s).toJSON()?.slice(0,10)===s;
const average=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length*100)/100:null;
function monthsBefore(asOf,months){
 const d=new Date(asOf);const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-months);
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
 d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);
}
export function comparableMetrics(records,asOf,{totalResidential,historyComplete=false,projectId}={}){
 if(!date(asOf)||typeof projectId!=='string'||!projectId)throw Error('缺少成交基準日或競案識別碼');
 const latest=new Map();
 for(const r of records){
  if(r.projectId!==projectId||!r.id||!date(r.date)||!date(r.revision)||r.revision>asOf)continue;
  const p=latest.get(r.id);
  if(!p||r.revision>p.revision)latest.set(r.id,r);
  else if(r.revision===p.revision&&JSON.stringify(r)!==JSON.stringify(p))throw Error('同一交易版本資料不一致');
 }
 const rows=[...latest.values()].filter(r=>r.status==='active'&&r.date<=asOf&&r.eligible===true&&['presale','first_sale','resale'].includes(r.saleType));
 const result={};
 for(const [key,start] of [['half',monthsBefore(asOf,6)],['year',monthsBefore(asOf,12)],['calendarYear',asOf.slice(0,4)+'-01-01']]){
  const period=rows.filter(r=>r.date>=start&&r.date<=asOf);
  result[key]={start,end:asOf,bySaleType:{}};
  for(const type of ['presale','first_sale','resale']){
   const sales=period.filter(r=>r.saleType===type);
   const homes=sales.filter(r=>r.use==='residential'&&r.floor>=2);
   const units=homes.filter(r=>positive(r.total)&&positive(r.area)&&
    (r.parkingKind==='none'||(positive(r.parkingTotal)&&positive(r.parkingArea)&&r.parkingTotal<r.total&&r.parkingArea<r.area)))
    .map(r=>r.parkingKind==='none'?r.total/r.area:(r.total-r.parkingTotal)/(r.area-r.parkingArea));
   const spaces=sales.filter(r=>r.parkingKind==='ramp_flat'&&r.parkingCount===1&&positive(r.parkingTotal)).map(r=>r.parkingTotal);
   const shops=sales.filter(r=>r.use==='shop'&&r.parkingKind==='none'&&positive(r.total)&&positive(r.area)).map(r=>r.total/r.area);
   result[key].bySaleType[type]={records:sales.length,residentialRecords:homes.length,residentialSamples:units.length,residentialMean:average(units),parkingSamples:spaces.length,parkingMean:average(spaces),shopSamples:shops.length,shopMean:average(shops)};
  }
 }
 const own=rows.filter(r=>r.use==='residential'&&r.saleType!=='resale');
 // Registration rows alone are insufficient: require full history and matched unit IDs.
 const units=new Set(own.map(r=>r.unitId));
 const sold=historyComplete&&Number.isInteger(totalResidential)&&totalResidential>0&&own.every(r=>r.unitId)&&units.size<=totalResidential?units.size:null;
 return {...result,sold,inventory:sold===null?null:totalResidential-sold,salesRate:sold===null?null:Math.round(sold/totalResidential*10000)/100};
}
export const SALES_FACT_CATEGORIES=Object.freeze({
 advantage:['site','buyers','transport','product_price','future'],
 resistance:['competition','price','substitution','waiting','physical','other']
});
export function marketDecision(input={}){
 const facts=new Map((input.facts||[]).filter(f=>f.id&&f.subject&&f.source&&f.evidenceStatus==='source_checked'&&f.applicable===true).map(f=>[f.id,f]));
 const seen=new Set();
 function points(kind){
  const categories=SALES_FACT_CATEGORIES[kind];
  return (input.points||[]).filter(p=>p.kind===kind&&categories.includes(p.category))
   .sort((a,b)=>categories.indexOf(a.category)-categories.indexOf(b.category))
   .filter(p=>{
    const f=facts.get(p.factId),key=f?.duplicateKey||f?.id;
    if(!f||f.kind==='land_cost'||f.kind==='missing'||f.kind==='advertisement'||seen.has(key)||
      ![p.buyerImpact,p.intentImpact,p.salesImpact,p.copy].every(x=>typeof x==='string'&&x.trim())||
      /待查|待複核|查無資料/.test(p.copy))return false;
    // A planned facility may affect positioning; its uplift cannot be counted as achieved.
    if(f.phase==='future'&&p.realizedPriceImpact!==false)return false;
    seen.add(key);return true;
   });
 }
 const advantages=points('advantage'),resistances=points('resistance');
 return {stages:MARKET_STAGES,who:input.who||null,why:input.why||null,product:input.product||null,price:input.price||null,totalPrice:input.totalPrice||null,advantages,resistances};
}

// Interpret the existing verifier's claims rather than trusting submitted flags.
export function reviewMarketInputs(input,audit,asOf){
 if(!input||typeof input!=='object'||!Array.isArray(input.points)||input.points.length>32)throw Error('市場判斷格式不正確');
 const claims=new Map((audit.claims||[]).filter(c=>c.status!=='衝突'&&c.reviewed&&c.source_read_count>0).map(c=>[c.field,c]));
 const facts=(input.facts||[]).slice(0,32).flatMap(f=>{
  const c=claims.get(f.claimField);
  if(!c||!c.sources.some(s=>s.subject===f.subject&&s.url===f.source&&(audit.source_checks||[]).some(check=>check.verified&&check.key===sourceKey(c.field,c.value,s)))||c.value!==f.value)return [];
  return [{...f,evidenceStatus:'source_checked'}];
 });
 const result=marketDecision({...input,facts});
 return {...result,asOf,comparables:(audit.comparables||[]).map(c=>({
  name:c.case_name,period:{start:c.scope?.date_from,end:c.scope?.date_to},
  residentialSamples:c.valid_count??null,residentialMean:c.average_unit_price??null,
  parking:c.parking||{},populationComplete:c.population_complete===true,
  // The existing comparable payload does not attest unit sales or inventory.
  sold:null,inventory:null,salesRate:null
 }))};
}
