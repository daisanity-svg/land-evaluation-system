const pair=(text,label,value)=>text.replace(new RegExp(`(^|\\n)([ \\t]*${label}[ \\t]*[：:])[^\\n]*`,'g'),(_m,a,b)=>a+b+value);
function section(text,id,edit){return text.replace(new RegExp(`(^[ \\t]*${id}[｜|][^\\n]*\\n)([\\s\\S]*?)(?=^[ \\t]*\\d{2}[｜|]|(?![\\s\\S]))`,'gm'),(_m,head,body)=>head+edit(body));}
export function applyReportAdjustments(text,values) {
  let result=String(text||'');
  if(!/^\s*01[｜|]/m.test(result))throw Error('請先載入完整報告再調整');
  for(const [field,title,unit] of [['residential','二樓以上住宅','萬／坪'],['shop','店面','萬／坪'],['parking','坡道平面車位','萬／位']]){
    const raw=String(values[field]||'').trim();if(!raw)continue;
    if(!/^\d+(?:\.\d+)?(?:\s*[～~－-]\s*\d+(?:\.\d+)?)?(?:\s*萬(?:元)?\s*[／/]\s*(?:坪|位))?$/.test(raw))throw Error(`${title}請填數字及正確單位`);
    if(/[／/]/.test(raw)&&!raw.replace(/元/g,'').endsWith(unit)&&!raw.replace(/元/g,'').endsWith(unit.replace('／','/')))throw Error(`${title}單位應為${unit}`);
    const price=raw.includes('萬')?raw:raw+unit;
    result=section(result,'09',body=>body.replace(new RegExp(`(${title}[ \\t]*[：:][^\\n]*\\n[ \\t]*建議成交價格[ \\t]*[：:])[^\\n]*`),(_m,label)=>label+price));
    if(field==='residential')for(const id of ['01','12'])result=section(result,id,body=>pair(body,'建議價格',price));
  }
  for(const [prefix,title] of [['twoRoom','兩房產品'],['threeRoom','三房產品']]){
    const lo=String(values[prefix+'Min']||'').trim(),hi=String(values[prefix+'Max']||'').trim();if(!lo&&!hi)continue;
    if(!lo||!hi||!Number.isFinite(Number(lo))||!Number.isFinite(Number(hi))||Number(lo)<=0||Number(hi)<Number(lo))throw Error(`${title}請填有效的最小及最大坪數`);
    result=section(result,'10',body=>body.replace(new RegExp(`(${title}[ \\t]*[：:][^\\n]*\\n[ \\t]*建議坪數[ \\t]*[：:])[^\\n]*`),(_m,label)=>label+lo+'～'+hi+'坪'));
  }
  const road=String(values.road||'').trim();if(road)for(const id of ['01','04'])result=section(result,id,body=>pair(body,'臨路條件',road));
  for(const direction of ['東向','南向','西向','北向'])if(String(values[direction]||'').trim())result=section(result,'04',body=>body.replace(new RegExp(`(^|\\n)([ \\t]*${direction})[：:｜|][^\\n]*`),(_m,a,b)=>a+b+'｜'+String(values[direction]).trim()));
  if(result===text)throw Error('沒有可套用的修改；請確認報告包含固定欄位並填寫調整值');
  return result;
}
