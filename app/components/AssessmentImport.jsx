'use client';
import {useState} from 'react';
import {readWorkValues} from '../../lib/ownerAssessment.mjs';
const names={location:'基地位置',area:'基地面積',zoning:'土地分區',coverage:'建蔽率',far:'容積率',road:'臨路',east:'東向',west:'西向',north:'北向',south:'南向',village:'里別',neighborhood:'鄰別',schoolPrimary:'國小學區',schoolSecondary:'國中學區',market:'區域銷況',product:'建議產品',residentialPrice:'住宅價格',shopPrice:'店面價格',parkingPrice:'坡道平面車位'};
const normalize=s=>String(s||'').normalize('NFKC').replace(/台/g,'臺').replace(/\s/g,'');
export default function AssessmentImport({landNumber,reportText,savedFields,onConfirm}){
 const [result,setResult]=useState(null),[source,setSource]=useState(''),[selected,setSelected]=useState({}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const fields=readWorkValues(reportText);
 const [values,setValues]=useState({});
 const [reason,setReason]=useState('');
 async function read(file){
  if(!file)return;
  setBusy(true);setResult(null);setSelected({});setMessage('正在讀取附件…');
  try{
   const body=new FormData();body.set('file',file);
   const r=await fetch('/api/research/import',{method:'POST',body});
   const data=await r.json();
   if(!r.ok)throw Error(data.error||'無法讀取附件');
   setResult(data);setValues(Object.fromEntries(data.candidates.map(c=>[c.field,c.value.replace(/（人工工作值）/g,'')])));setSource(data.source.filename+' / SHA256:'+data.source.sha256);
   setMessage(data.notice||'已擷取候選值，請核對本案正文後再鎖定。');
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 const mismatch=result?.landNumber&&normalize(result.landNumber)!==normalize(landNumber);
 async function confirm(){
  setBusy(true);
  try{
   await onConfirm(Object.keys(selected).filter(key=>selected[key]).map(field=>({field,value:values[field]??fields[field].replace(/（人工工作值）/g,''),source,reason,locked:true})));
   setMessage('工作值已鎖定。人工確認不等於官方核實。');setSelected({});
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 return <details className="utility-details"><summary>附件擷取與人工工作值</summary>
  <label>上傳 Excel、PDF 或基地圖<input type="file" accept=".xlsx,.pdf,.png,.jpg,.jpeg" disabled={busy} onChange={e=>read(e.target.files[0])}/></label>
  <p role="status">{message}</p>
  {mismatch&&<p role="alert">附件地號「{result.landNumber}」與本案不一致，不能採用。</p>}
  {!!result?.candidates.length&&<ul>{result.candidates.map((c,i)=><li key={i}>{names[c.field]}：{c.value}（附件候選值）</li>)}</ul>}
  {result?.excerpt&&<details><summary>PDF 擷取原文</summary><pre style={{whiteSpace:'pre-wrap'}}>{result.excerpt}</pre></details>}
  {reportText&&<><p>輸入採用值後勾選確認，正文、摘要和匯出會同步更新。研究回傳若有差異，會拒絕覆蓋。</p>
   <label>人工資料來源<input value={source} onChange={e=>setSource(e.target.value)} maxLength={300}/></label>
   <label>採用理由<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={300}/></label>
   <ul>{Object.entries(fields).map(([key,v])=><li key={key}><label><input type="checkbox" checked={!!selected[key]} onChange={e=>setSelected(old=>({...old,[key]:e.target.checked}))}/>{names[key]}{savedFields?.[key]?.locked?'（已鎖定）':''}</label><input aria-label={names[key]+'採用值'} value={values[key]??v.replace(/（人工工作值）/g,'')} onChange={e=>setValues(old=>({...old,[key]:e.target.value}))}/></li>)}</ul>
   <button type="button" className="btn" disabled={busy||mismatch||!source.trim()||!reason.trim()||!Object.values(selected).some(Boolean)} onClick={confirm}>儲存並鎖定選取欄位</button>
  </>}
 </details>;
}
