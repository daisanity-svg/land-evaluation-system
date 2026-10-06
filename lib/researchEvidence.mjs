// Deterministic audit of submitted evidence. This does not fetch or certify sources.
export const CORE_FIELDS = ['location','area','zoning','coverage','far','road','village','elementary_school','junior_school','residential_price'];
const clean = value => String(value ?? '').normalize('NFKC').replace(/\s+/g,'').replace(/台/g,'臺');
const unknown = /待複核|待確認|無法取得|無法確認|推估|估算|尚未(?:確認|取得|核實|查明)/;
const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const median = a => {const b=[...a].sort((x,y)=>x-y);return b.length ? (b[Math.floor((b.length-1)/2)]+b[Math.floor(b.length/2)])/2 : null;};
const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
const round = value => value===null ? null : Math.round(value*10000)/10000;
function reportValue(text,field) {
  const matches=[...String(text).matchAll(/^[ \t]*(\d{2})[｜|][^\n]+$/gm)],parts={};
  matches.forEach((m,i)=>{parts[m[1]]=text.slice(m.index+m[0].length,matches[i+1]?.index||text.length);});
  const mapping={location:['01','基地位置'],area:['01','基地面積'],zoning:['03','土地使用分區'],coverage:['03','建蔽率'],far:['03','容積率'],road:['04','臨路條件'],village:['06','里別'],elementary_school:['06','基礎教育學區'],junior_school:['06','中等教育學區'],residential_price:['09','建議成交價格']};
  const [id,label]=mapping[field]||[];
  return id ? (parts[id]||'').match(new RegExp(`(?:^|\\n)[ \\t]*${label}[ \\t]*[：:]([^\\n]*)`))?.[1]?.trim()||'' : '';
}
function sourceGroup(source) {
  try {
    const url=new URL(source.url); if(!['https:','http:','attachment:'].includes(url.protocol))return '';
    if(url.protocol==='attachment:')return source.kind==='document' ? 'document:'+url.hostname+url.pathname : '';
    const host=url.hostname.toLowerCase();
    // Mirror platforms publishing MOI transactions do not become independent evidence.
    if(/(^|\.)(leju\.com\.tw|591\.com\.tw|lvr\.land\.moi\.gov\.tw|shijia-ai\.com)$/.test(host)&&source.dataset==='transactions')return 'moi-transactions';
    return String(source.upstream_source||host).toLowerCase().trim();
  } catch {return '';}
}
export function validateEvidenceShape(evidence) {
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))return ['核實紀錄須為物件'];
  const errors=[];
  if(evidence.version!==1)errors.push('核實紀錄版本須為1');
  if(!String(evidence.land_number||'').trim())errors.push('核實紀錄缺少目標地號');
  if(!isoDate(evidence.research_date))errors.push('調研日期須為有效YYYY-MM-DD');
  if(!Array.isArray(evidence.claims)||evidence.claims.length>120)errors.push('claims須為陣列，最多120項');
  if(evidence.transactions!==undefined&&(!Array.isArray(evidence.transactions)||evidence.transactions.length>2000))errors.push('transactions須為陣列，最多2000筆');
  if(JSON.stringify(evidence).length>1200000)errors.push('核實紀錄超過容量上限');
  return errors;
}
export function calculateTransactions(rows=[],scope={}) {
  const errors=[],warnings=[],excluded=[],accepted=[],ids=new Set();
  if(!isoDate(scope.date_from)||!isoDate(scope.date_to)||scope.date_from>scope.date_to)errors.push('成交統計缺少有效起訖日期');
  if(!scope.project_id||!['presale','resale'].includes(scope.market_type))errors.push('成交統計缺少建案識別或交易類型');
  if(scope.use!=='住宅')errors.push('本次住宅計算須指定住宅用途');
  for(const [index,row] of rows.entries()) {
    const reasons=[]; const id=String(row?.id||'').trim();
    if(!id)reasons.push('缺少交易識別碼');else if(ids.has(id))reasons.push('重複交易');else ids.add(id);
    if(row?.date_precision==='month'&&typeof row.date==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(row.date)) {
      const first=row.date+'-01';
      const end=new Date(Date.UTC(Number(row.date.slice(0,4)),Number(row.date.slice(5,7)),0)).toISOString().slice(0,10);
      if(first<scope.date_from||end>scope.date_to)reasons.push('月份交易跨越統計邊界，須查明實際日期');
    } else if(!isoDate(row?.date))reasons.push('日期無效');
    else if(row.date<scope.date_from||row.date>scope.date_to)reasons.push('不在統計期間');
    if(row?.project_id!==scope.project_id)reasons.push('建案不符');
    if(row?.market_type!==scope.market_type)reasons.push('交易類型不符');
    if(row?.use!=='住宅')reasons.push('非住宅');
    if(row?.status!=='valid')reasons.push('撤銷、更正未定或交易狀態不明');
    if(row?.special!==false)reasons.push('特殊交易或特殊註記未確認');
    if(!finite(row?.floor)||row.floor<2)reasons.push('一樓或樓層未確認');
    if(!finite(row?.total_price_wan)||row.total_price_wan<=0||!finite(row?.building_area_m2)||row.building_area_m2<=0)reasons.push('總價或建物面積無效');
    if(!finite(row?.parking_price_wan)||row.parking_price_wan<0||!finite(row?.parking_area_m2)||row.parking_area_m2<0||!Number.isInteger(row?.parking_spaces)||row.parking_spaces<0)reasons.push('車位價、面積或位數未確認');
    if(row?.parking_spaces===0&&(row.parking_price_wan!==0||row.parking_area_m2!==0))reasons.push('無車位與車位欄位矛盾');
    if(row?.parking_spaces>0&&(!row.parking_type||row.parking_price_wan<=0||row.parking_area_m2<=0))reasons.push('有車位但類型、拆價或拆面積不足');
    if(!sourceGroup(row||{}))reasons.push('缺少可追溯成交來源');
    const netArea=row?.building_area_m2-row?.parking_area_m2,netPrice=row?.total_price_wan-row?.parking_price_wan;
    if(netArea<=0||netPrice<=0)reasons.push('扣車位後價格或面積無效');
    if(reasons.length){excluded.push({index,id,reasons});continue;}
    const unit=netPrice/(netArea*.3025);
    if(row.unit_price_wan_ping!==undefined&&(!finite(row.unit_price_wan_ping)||Math.abs(row.unit_price_wan_ping-unit)>.1))errors.push(`${id}申報單價與扣車位重算差距超過0.1萬/坪`);
    accepted.push({...row,net_area_ping:round(netArea*.3025),calculated_unit_price:round(unit),exact_unit_price:unit});
  }
  const prices=accepted.map(x=>x.exact_unit_price),avg=mean(prices),mid=median(prices);
  if(avg!==null&&mid>0&&Math.abs(avg-mid)/mid>.1)warnings.push('均價與中位數差距超過10%，須逐筆檢查極端值');
  if(accepted.length<3)warnings.push('有效可比成交少於3筆，可列實際統計值並標示樣本有限，不宜作主要定價依據');
  const parking={};
  for(const row of accepted.filter(x=>x.parking_spaces>0)){parking[row.parking_type]??={total_price_wan:0,spaces:0};parking[row.parking_type].total_price_wan+=row.parking_price_wan;parking[row.parking_type].spaces+=row.parking_spaces;}
  for(const group of Object.values(parking))group.average_price_wan=round(group.total_price_wan/group.spaces);
  const coverage=scope.population_complete===true&&Number.isInteger(scope.total_count)&&scope.total_count===rows.length;
  if(!coverage)warnings.push('完整母體未確認，不能把本頁筆數當期間總筆數');
  return {scope,returned_count:rows.length,valid_count:accepted.length,excluded,accepted:accepted.map(({exact_unit_price,...x})=>x),average_unit_price:round(avg),median_unit_price:round(mid),parking,errors,warnings,population_complete:coverage,calculation_complete:!errors.length&&coverage&&accepted.length>=3};
}
export function auditResearchEvidence(evidence,report={}) {
  if(!evidence)return {present:false,claims:[],missing_fields:CORE_FIELDS,errors:[],review_record_complete:false,source_verification_complete:false};
  const errors=validateEvidenceShape(evidence);
  if(errors.length)return {present:true,claims:[],missing_fields:CORE_FIELDS,errors,review_record_complete:false,source_verification_complete:false};
  if(report.land_number&&clean(report.land_number)!==clean(evidence.land_number))errors.push('核實紀錄地號與案件不一致');
  if(report.research_date&&report.research_date!==evidence.research_date)errors.push('核實紀錄日期與案件不一致');
  const claims=[];const seen=new Set();
  for(const claim of evidence.claims){
    if(!claim||typeof claim!=='object'||!claim.field||seen.has(claim.field)){errors.push('核實項目缺少欄名或重複');continue;}seen.add(claim.field);
    const sources=Array.isArray(claim.sources)?claim.sources.filter(s=>s&&sourceGroup(s)&&isoDate(s.accessed_at)&&s.accessed_at<=evidence.research_date&&String(s.title||'').trim()&&String(s.value||'').trim()):[];
    const mismatch=sources.some(s=>clean(s.value)!==clean(claim.value));
    const independent=new Set(sources.map(sourceGroup)).size;
    // Only a reviewer who actually opened the documents may record agreement.
    const reviewed=claim.reviewed_by==='primary_agent'&&isoDate(claim.reviewed_at)&&claim.reviewed_at<=evidence.research_date;
    const formal=!CORE_FIELDS.includes(claim.field)||claim.field==='residential_price'||sources.some(s=>['official','document'].includes(s.kind));
    let status=!String(claim.value||'').trim()||unknown.test(String(claim.value))||!sources.length?'無法取得':mismatch||claim.conflict===true?'衝突':independent>=2&&reviewed&&formal?'已核實':'單一來源';
    if(status==='衝突')errors.push(`${claim.field}來源內容有衝突`);
    if(claim.status==='已核實'&&status!=='已核實')errors.push(`${claim.field}不符合已核實條件`);
    if(claim.value&&!unknown.test(String(claim.value))&&report.report_text&&CORE_FIELDS.includes(claim.field)&&clean(reportValue(report.report_text,claim.field))!==clean(claim.value))errors.push(`${claim.field}核實数值與本案對應欄位不一致`);
    if(claim.field==='residential_price'&&/[\d]\s*[～~－-]\s*\d/.test(String(claim.value)))errors.push('住宅價格須為期間均價，不接受價格區間代替');
    claims.push({field:claim.field,value:claim.value||'',status,independent_source_count:independent,sources,reviewed});
  }
  const missing_fields=CORE_FIELDS.filter(field=>!claims.some(c=>c.field===field&&c.status==='已核實'));
  const transactions=evidence.transactions?.length?calculateTransactions(evidence.transactions,evidence.market_scope||{}):null;
  if(transactions)errors.push(...transactions.errors);
  if(transactions?.calculation_complete){
    const claim=claims.find(c=>c.field==='residential_price');const p=String(claim?.value||'').match(/(\d+(?:\.\d+)?)\s*萬/);
    if(p&&Math.abs(Number(p[1])-transactions.average_unit_price)>.1)errors.push('住宅價格與主要可比組重算均價不一致');
  }
  return {present:true,claims,missing_fields,errors,transactions,review_record_complete:!errors.length&&!missing_fields.length&&Boolean(transactions?.calculation_complete)&&(!transactions.warnings.length||evidence.outliers_reviewed===true),source_verification_complete:false,verification_scope:'submitted_evidence_structure_and_recalculation',note:'來源一致性依主代理提交的查閱紀錄；系統未自動開啟來源驗證真實內容。'};
}

