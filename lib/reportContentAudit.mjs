import {fieldBlock} from './reportFields.mjs';
import {calculateTransactions} from './researchEvidence.mjs';
const norm=x=>String(x||'').normalize('NFKC').replace(/\s|[，。、；：]/g,'');
const unknown=/待複核|待確認|尚無|無法取得/;
export function auditContent(sections,evidence={},verifiedClaims=[]) {
  const missing=[],conflicts=[];
  const proofs=evidence?.content_evidence||{};
  const supported=p=>p&&Array.isArray(p.claim_fields)&&p.claim_fields.length>0&&p.claim_fields.every(f=>verifiedClaims.some(c=>c.field===f&&c.status==='已核實'));
  for(const [key,aliases,minFacts] of [['traffic',['交通動線','交通通勤'],2],['living',['生活機能'],2],['public',['公共建設'],3]]) {
    const text=fieldBlock(sections['05'],aliases),proof=proofs[key];
    if(text.length<35||unknown.test(text)||!supported(proof)||new Set(proof?.claim_fields||[]).size<minFacts||norm(proof?.text)!==norm(text))missing.push(aliases[0]+'須有具名事實、銷售影響及來源依據');
  }
  for(const [key,label,next] of [['strengths','銷售優勢','銷售抗性'],['weaknesses','銷售抗性',null]]) {
    const block=String(sections['11']||'').split(new RegExp(label+'\\s*[：:]'))[1]?.split(next?new RegExp(next+'\\s*[：:]'):/$(?!)/)[0]||'';
    const items=[...block.matchAll(/^\s*(?:[一二三四五六七八九十0-9]+[、.．])\s*(.+)$/gm)].map(m=>m[1].trim());
    const records=Array.isArray(proofs[key])?proofs[key]:[],used=new Set();let valid=items.length===3&&records.length===3;
    for(let i=0;i<items.length;i++) {
      const p=records[i];if(items[i].length<12||unknown.test(items[i])||!supported(p)||norm(p?.text)!==norm(items[i]))valid=false;
      for(const f of p?.claim_fields||[]){const fact=norm(verifiedClaims.find(c=>c.field===f)?.value||f);if(used.has(fact))valid=false;used.add(fact);}
    }
    if(!valid)missing.push(label+'三項須各有不同事實與證據');
  }
  const caseMatches=[...String(sections['08']||'').matchAll(/^\s*競案[一二三四五六七八九十0-9]+[｜|]([^\n]+)/gm)];
  const groups=Array.isArray(evidence.comparables)?evidence.comparables.filter(g=>g&&typeof g==='object'):[],seen=new Set();
  for(let i=0;i<caseMatches.length;i++) {
    const m=caseMatches[i],name=m[1].trim(),body=sections['08'].slice(m.index+m[0].length,caseMatches[i+1]?.index||sections['08'].length);
    for(const [label,aliases] of [['建設公司',['建設公司']],['房型與規劃坪數',['案子規劃']],['預售成屋與屋齡',['屋齡']]]) {
      const value=fieldBlock(body,aliases);
      if(!value||unknown.test(value)||(label==='房型與規劃坪數'&&(!/房/.test(value)||!/[0-9].*坪/.test(value))))missing.push(name+'：'+label+'尚未補齊');
    }
    const records=groups.filter(g=>norm(g.case_name)===norm(name));
    if(records.length!==1){missing.push(name+'逐案成交明細與統計區間');continue;}
    const g=records[0];if(seen.has(g.market_scope?.project_id)){conflicts.push(name+'重複使用其他競案交易母體');continue;}seen.add(g.market_scope?.project_id);
    if(!Array.isArray(g.transactions)||g.transactions.length>2000){missing.push(name+'完整成交明細');continue;}
    const stats=calculateTransactions(g.transactions,g.market_scope||{});conflicts.push(...stats.errors.map(x=>name+'：'+x));
    const count=Number(fieldBlock(body,'成交筆數').match(/\d+/)?.[0]);
    const price=Number(fieldBlock(body,'成交價格').match(/(\d+(?:\.\d+)?)\s*萬/)?.[1]);
    if(stats.population_complete&&(!Number.isFinite(price)||count!==stats.valid_count||Math.abs(price-stats.average_unit_price)>.1))conflicts.push(name+'正文成交筆數或均價與逐筆驗算不一致');
    if(!stats.calculation_complete)missing.push(name+'完整有效成交母體');
    const period=fieldBlock(body,'成交期間'),scope=g.market_scope||{};
    if(!period.includes(scope.date_from||'__missing__')||!period.includes(scope.date_to||'__missing__'))missing.push(name+'成交期間須與明細起訖日期一致');
    const parkingType=fieldBlock(body,'車位類型'),parking=stats.parking[parkingType];
    const parkingPrice=Number(fieldBlock(body,'車位價格').match(/(\d+(?:\.\d+)?)\s*萬/)?.[1]);
    if(parking&&Number.isFinite(parkingPrice)&&Math.abs(parking.average_price_wan-parkingPrice)>.1)conflicts.push(name+'車位均價與同型逐位驗算不一致');
    if(!parking||!Number.isFinite(parkingPrice))missing.push(name+'同型車位價格與位數');
    if(!verifiedClaims.some(c=>c.field==='case_price:'+name&&c.status==='已核實'))missing.push(name+'成交來源查閱與核對');
    if(stats.warnings.length&&!(g.outliers_reviewed===true&&String(g.outlier_review_note||'').length>=20))missing.push(name+'統計限制與極端值說明');
  }
  return {missing,conflicts};
}
