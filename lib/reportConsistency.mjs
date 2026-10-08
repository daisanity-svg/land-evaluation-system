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
    const area=areaPing(item);
    // Allow rounded appraisal prose; flag large differences, not decimal rounding.
    if(area&&Math.abs(area-canonicalArea)>Math.max(3,canonicalArea*.03))
      conflicts.push('基地面積在基本資料與綜合評估不一致');
    if(/(?:千坪|千餘坪)/.test(item)&&canonicalArea<970)
      conflicts.push('基地不足千坪，綜合評估卻描述為千坪基地');
  }
  return [...new Set(conflicts)];
}
