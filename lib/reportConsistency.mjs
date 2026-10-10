import {fieldBlock} from './reportFields.mjs';
// Compare only descriptions of this base, never a competing project's sizes.
const numerals={單:1,一:1,雙:2,二:2,三:3,四:4};
const unknown=/待複核|待確認|尚未|無法/;
function roadCounts(text) {
  return [...String(text||'').matchAll(/([單雙一二三四1-4])面臨路/g)]
    .map(m=>numerals[m[1]]||Number(m[1]));
}
function areaPing(text) {
  if(unknown.test(String(text||'')))return null;
  const m=String(text||'').replace(/,/g,'').match(/(\d+(?:\.\d+)?)\s*(坪|平方公尺|㎡|m²)/i);
  return m?Number(m[1])*(m[2]==='坪'?1:.3025):null;
}
export function auditBaseConsistency(sections={},summary={}) {
  const conflicts=[];
  const areaLine=String(sections['01']||'').match(/^基地面積[：:]\s*(.+)$/m)?.[1];
  const canonicalArea=areaPing(areaLine)||areaPing(summary.area);
  const canonicalRoad=String(sections['04']||'').match(/^臨路條件[：:]\s*(.+)$/m)?.[1]||summary.road||'';
  const baseRoads=unknown.test(canonicalRoad)?[]:roadCounts(canonicalRoad);
  const swot=String(sections['11']||'');
  const counts=[...baseRoads,...roadCounts(swot)];
  if(new Set(counts).size>1)conflicts.push('臨路面數在基地條件與綜合評估不一致');
  if(canonicalArea)for(const item of swot.split(/\n/)) {
    if(!/基地|土地|面積/.test(item)||unknown.test(item))continue;
    if(/競案|比較案|參考案|鄰案/.test(item)&&!/本(?:案|基地)|本標的/.test(item))continue;
    const area=areaPing(item);
    // Allow rounded appraisal prose; flag large differences, not decimal rounding.
    if(area&&Math.abs(area-canonicalArea)>Math.max(3,canonicalArea*.03))
      conflicts.push('基地面積在基本資料與綜合評估不一致');
    if(/(?:千坪|千餘坪)/.test(item)&&canonicalArea<970)
      conflicts.push('基地不足千坪，綜合評估卻描述為千坪基地');
  }
  return [...new Set(conflicts)];
}

const unresolved=/待複核|待確認|尚未|無法|未定/;
const pricePattern=/(\d+(?:\.\d+)?)(?:\s*[～~－–—-]\s*(\d+(?:\.\d+)?))?\s*萬(?:元)?\s*[／/]\s*坪/g;
function priceRanges(text) {
  return [...String(text||'').normalize('NFKC').matchAll(pricePattern)]
    .map(m=>[Number(m[1]),Number(m[2]||m[1])]);
}
function recommendedRanges(text) {
  // Deliberately scope to an explicit recommendation for this base. A nearby
  // project's achieved price, an asking price, or a future scenario is not one.
  const result=[];
  for(const sentence of String(text||'').normalize('NFKC').split(/[。；;\n]/)) {
    const subject=sentence.search(/本案|本基地|本標的/);
    if(subject<0)continue;
    const base=sentence.slice(subject);
    if(/若|假設|情境|原建議|原先|原預判/.test(base))continue;
    const recommend=base.match(/(?:建議|預判|初估)(?:[^。；;\n]{0,35}?)(?:\d)/);
    if(!recommend)continue;
    const tail=base.slice(recommend.index);
    if(unresolved.test(tail)||/開價|開盤價|土地價格|地價|店面|車位|若|假設|情境|原建議|原先|原預判/.test(tail))continue;
    if(!/住宅|成交|售價/.test(base))continue;
    const value=priceRanges(tail)[0];
    if(value)result.push(value);
  }
  return result;
}
export function auditRecommendedPrice(sections={},summary={}) {
  const residential=String(sections['09']||'').split(/店面\s*[：:]/)[0];
  const direct=[
    fieldBlock(sections['01'],'建議價格'),summary.price,
    fieldBlock(residential,'建議成交價格'),fieldBlock(sections['12'],'建議價格'),
  ].filter(v=>v&&!unresolved.test(v)).flatMap(priceRanges);
  // Only the summary paragraph of chapter 08, never its competitor cards.
  const prose=[fieldBlock(sections['08'],'市場行情總結'),sections['10'],sections['11'],sections['12']]
    .flatMap(recommendedRanges);
  if(!prose.length||!direct.length)return [];
  const all=[...direct,...prose];
  return Math.max(...all.map(r=>r[0]))>Math.min(...all.map(r=>r[1]))+0.01
    ?['本案住宅建議價格在市場行情、產品評估與價格表不一致']:[];
}

export function auditDeclaredFacts(sections={},summary={}) {
  const conflicts=[];
  const fields=[
    ['土地使用分區','zoning'],['基地面積','area'],['里別',null],
    ['基礎教育學區',null],['中等教育學區',null],
  ];
  for(const [label,key] of fields) {
    const values=['01','02','03','06','12'].map(id=>fieldBlock(sections[id],label).split('\n')[0]);
    if(key)values.push(summary[key]);
    const known=values.filter(v=>v&&!unresolved.test(v));
    if(label==='基地面積') {
      const areas=known.map(areaPing).filter(v=>v!==null);
      if(areas.length>1&&Math.max(...areas)-Math.min(...areas)>Math.max(3,Math.max(...areas)*.03))
        conflicts.push('基地面積在摘要、基本資料或結論不一致');
    } else {
      const normalized=known.map(v=>String(v).normalize('NFKC').replace(/[\s。、；;]+$/g,'').replace(/\s/g,''));
      if(new Set(normalized).size>1)conflicts.push(label+'在不同章節或摘要不一致');
    }
  }
  // Compare descriptions of the SAME direction, not legitimate access roads
  // elsewhere in the living-area paragraph.
  for(const direction of ['北','西','南','東']) {
    const values=['01','02','04','11','12'].flatMap(id=>[...String(sections[id]||'').matchAll(
      new RegExp(direction+'向[｜|：:]\\s*([^\\n。]+)','g'))].map(m=>m[1]));
    const names=values.filter(v=>!unresolved.test(v)).map(v=>v.match(/(?:臨|面向)\s*([\u4e00-\u9fff]+?(?:大道|路|街)(?:[一二三四五六七八九十]+段)?)/)?.[1]).filter(Boolean);
    if(new Set(names).size>1)conflicts.push(direction+'向臨路名稱在不同章節不一致');
  }
  return [...new Set(conflicts)];
}
