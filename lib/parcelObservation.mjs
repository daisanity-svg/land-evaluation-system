const norm=x=>String(x||'').normalize('NFKC').replace(/\s/g,'');
export function recordParcelObservation(payload,input) {
 if(norm(payload.land_number)!==norm(input.land_number))throw Error('附件地號與本案不一致，未採用。');
 const url=new URL(input.url);
 if(url.protocol!=='https:'||!/(?:^|\.)gov\.tw$/.test(url.hostname))throw Error('請填原始官方來源網址。');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||Number.isNaN(Date.parse(input.date)))throw Error('請填實際查閱日期。');
 if(!/^[a-f0-9]{64}$/.test(input.sha256||''))throw Error('須先選取原始附件以記錄雜湊。');
 const excerpt=String(input.excerpt||'').trim();
 const lot=norm(payload.land_number).match(/([^市區鄉鎮]+段(?:[^段]+小段)?\d+(?:-\d+)?地號)$/)?.[1];
 if(excerpt.length<20||!lot||!norm(excerpt).includes(lot))throw Error('原文須含本案完整地段、地號及實際可見欄位。');
 for(const key of ['area','village','longitude','latitude'])if(input[key]){const raw=norm(excerpt).replace(/(?<=\d),(?=\d{3}(?:[.]|[^0-9]|$))/g,''),value=norm(input[key]).replace(/,/g,'');const found=key==='village'?raw.includes(value):new RegExp('(?:^|[^0-9.])'+value.replace(/\./g,'\\.')+'(?:[^0-9.]|$)').test(raw);if(!found)throw Error('填入的'+key+'未出現在原文摘錄，未採用。');}
 const definitions=[['area',input.area?`${Number(input.area)}㎡，約${(Number(input.area)*.3025).toFixed(2)}坪`:''],['village',input.village||''],['location',input.longitude&&input.latitude?`WGS84 ${Number(input.longitude)}, ${Number(input.latitude)}（官方圖臺人工查閱）`:'']];
 if(input.area&&(!Number.isFinite(Number(input.area))||Number(input.area)<=0))throw Error('面積須為正平方公尺。');
 if(input.village&&!/里$/.test(input.village))throw Error('里別請保留完整里名。');
 if(Boolean(input.longitude)!==Boolean(input.latitude))throw Error('經緯度須成對填寫。');
 if(input.longitude&&(!(Number(input.longitude)>=118&&Number(input.longitude)<=123)||!(Number(input.latitude)>=20&&Number(input.latitude)<=27)))throw Error('經緯度超出臺灣合理範圍。');
 const e=structuredClone(payload.research_evidence||{version:1,land_number:payload.land_number,research_date:payload.research_date,claims:[]});
 e.claims=Array.isArray(e.claims)?e.claims:[];
 for(const [field,value] of definitions.filter(x=>x[1])) {
  if(e.claims.some(c=>c.field===field&&c.value!==value))throw Error('既有'+field+'紀錄不同，請先核對衝突，未覆蓋舊值。');
  if(e.claims.some(c=>c.field===field&&c.value===value))continue;
  e.claims.push({field,value,reviewed_by:'user',reviewed_at:input.date,sources:[{url:input.url,kind:'official',title:'官方圖臺／文件人工查閱',subject:payload.land_number,raw_value:excerpt,value,accessed_at:input.date,observation:{sha256:input.sha256,locator:input.filename,method:'user_transcription',status:'needs_manual_review'}}]});
 }
 if(!definitions.some(x=>x[1]))throw Error('請至少填一項附件實際可見資料。');
 return {...payload,research_evidence:e};
}
