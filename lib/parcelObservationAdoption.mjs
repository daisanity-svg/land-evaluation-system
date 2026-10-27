import {canonicalSummary,reportSections,labelledValue} from './reportData.mjs';
const norm=x=>String(x||'').normalize('NFKC').replace(/[\s。、]/g,'');
const unknown=x=>!x||/待複核|待確認|尚未|未完成|未核實|無法/.test(x);
export function adoptParcelObservations(payload,confirmed=false) {
 if(!confirmed)throw Error('請先逐項對照原件並確認套用。');
 const evidence=structuredClone(payload.research_evidence||{});
 if(norm(evidence.land_number)!==norm(payload.land_number))throw Error('查閱紀錄地號與本案不同，未套用。');
 let text=String(payload.report_text||'');const sections=reportSections(text);
 if(!sections['01']||!sections['02']||!sections['06'])throw Error('須先有本案完整初評草稿，才能套用查閱值。');
 const land=labelledValue(sections['01'],['目標地號','標的地號']);
 if(norm(land)!==norm(payload.land_number))throw Error('草稿地號與查閱紀錄不同，未套用。');
 const claims=(evidence.claims||[]).filter(c=>['area','village','location'].includes(c.field)&&c.sources?.some(s=>s.observation?.method==='user_transcription'&&s.observation?.status==='needs_manual_review'&&/^[a-f0-9]{64}$/.test(s.observation.sha256||'')));
 if(!claims.length)throw Error('沒有可套用的原件查閱值。');
 const replacements={};const applied=[];
 const set=(id,labels,value)=>{
  let body=replacements[id]??sections[id];const prior=labelledValue(body,labels);
  if(!unknown(prior)&&!(id==='01'&&labels.includes('基地位置')&&norm(prior)===norm(payload.land_number))&&norm(prior)!==norm(value))throw Error(labels[0]+'已有不同值，請先處理衝突。');
  const pattern=new RegExp('^('+labels.join('|')+')[：:][^\\n]*','m');
  if(pattern.test(body))body=body.replace(pattern,(_,label)=>label+'：'+value);else body+='\n'+labels[0]+'：'+value;
  replacements[id]=body;
 };
 for(const c of claims){
  if(!c.value||unknown(c.value))continue;
  if(c.field==='area'){
   const lotRows=sections['02'].split('\n').filter(l=>/[｜|]/.test(l)&&!/^(地號|合計)/.test(l.trim()));
   if(lotRows.length!==1)throw Error('多筆或非逐列基地資料須逐筆核對，不自動套用合計面積。');
   const m=String(c.value).match(/^([\d.]+)㎡，約([\d.]+)坪$/);if(!m)throw Error('面積格式不符，未套用。');
   set('01',['基地面積','合計面積'],c.value);
   const rows=(replacements['02']??sections['02']).split('\n').map(line=>{
    if(line!==lotRows[0]&&!/^合計[｜|]/.test(line.trim()))return line;
    const cells=line.split(/[｜|]/);for(let i=1;i<=2;i++)if(!unknown(cells[i])&&Math.abs(Number(cells[i].replace(/,/g,''))-Number(m[i]))>.02)throw Error('基地表面積已有不同值，未覆蓋。');
    cells[1]=m[1];cells[2]=m[2];return cells.join('｜');
   });replacements['02']=rows.join('\n');
  }else if(c.field==='village')set('06',['里別'],c.value);
  else set('01',['基地位置','標的位置'],c.value);
  applied.push(c.field);
 }
 if(!applied.length)throw Error('沒有可套用的欄位。');
 const sourceNotes=claims.flatMap(c=>(c.sources||[]).filter(s=>s.observation?.method==='user_transcription').map(s=>s.url+'（查閱日期'+s.accessed_at+'）'));
 replacements['02']=(replacements['02']??sections['02']).replace(/^附件引用紀錄：[^\n]*\n?/gm,'')+'\n附件引用紀錄：'+[...new Set(sourceNotes)].join('；')+'；人工核對後引用於初評，原件及來源核實仍未完成，不代表法定證明。';
 // Replace sections by boundaries, leaving every other chapter untouched.
 const headers=[...text.matchAll(/^\s*(\d{2})[｜|][^\n]+$/gm)];
 for(let i=headers.length-1;i>=0;i--){const h=headers[i];if(replacements[h[1]]!==undefined)text=text.slice(0,h.index+h[0].length)+'\n'+replacements[h[1]]+'\n'+text.slice(headers[i+1]?.index||text.length);}
 evidence.draft_adoption={fields:applied,confirmed_against_original:true,status:'needs_manual_review',note:'人工核對後引用於初評；不代表伺服器核實。'};
 const s=canonicalSummary(text,{});
 return {...payload,report_text:text,summary:{...(payload.summary||{}),location:s.location,area:s.area,_research_evidence:evidence},research_evidence:evidence};
}
