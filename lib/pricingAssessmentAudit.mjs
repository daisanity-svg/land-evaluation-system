const valueOf=s=>{const m=String(s||'').normalize('NFKC').match(/(\d+(?:\.\d+)?)\s*萬(?:元)?\s*[／/]\s*坪/);return m?Number(m[1]):null};
// Verify an explicit estimate separately from achieved comparable prices.
export function auditPricingAssessment(assessment,transactions,claims,reportPrice='') {
 if(!assessment)return {present:false,complete:false,errors:[]};
 const errors=[],r=assessment.residential;
 if(assessment.version!==1||assessment.type!=='estimated'||!r||!Number.isFinite(r.value)||r.value<=0||r.unit!=='萬/坪')errors.push('本案價格初估須有有效數字、單位與estimated標示');
 if(!transactions?.calculation_complete)errors.push('本案初估缺少完整主要可比組成交驗算');
 if(!Number.isFinite(r?.base_value)||Math.abs((r?.base_value||0)-(transactions?.average_unit_price||0))>.1)errors.push('初估基準須對應主要可比組重算均價');
 const adjustments=Array.isArray(r?.adjustments)?r.adjustments:[];
 if(adjustments.length>12)errors.push('價格調整項目過多');
 for(const a of adjustments)if(!Number.isFinite(a?.amount)||String(a?.reason||'').trim().length<12||!Array.isArray(a?.claim_fields)||!a.claim_fields.length||!a.claim_fields.every(f=>claims.some(c=>c.field===f&&c.status==='已核實')))errors.push('價格調整須連結已核實的區位或環境事實與判斷理由');
 if(!adjustments.length&&String(r?.rationale||'').trim().length<20)errors.push('未調整主要可比均價仍須說明本案適用理由');
 if(Number.isFinite(r?.value)&&Math.abs(r.value-(r.base_value+adjustments.reduce((s,a)=>s+(Number.isFinite(a?.amount)?a.amount:0),0)))>.1)errors.push('本案初估與基準加減調整的計算不一致');
 if(valueOf(reportPrice)!==null&&Math.abs((r?.value||0)-valueOf(reportPrice))>.1)errors.push('本案初估與價格預判正文不一致');
 if(!reportPrice||!/初估|估計|預估|推估/.test(reportPrice))errors.push('價格預判正文須清楚標示為初估');
 return {present:true,complete:!errors.length,errors};
}
