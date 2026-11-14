'use client';
import {useState} from 'react';
import {recordParcelObservation} from '../../lib/parcelObservation.mjs';
import {adoptParcelObservations} from '../../lib/parcelObservationAdoption.mjs';
export default function ParcelObservation({payload,onRecorded}) {
 const [values,setValues]=useState({date:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(new Date()),url:'https://maps.nlsc.gov.tw/T09/mobilemap.action'}),[file,setFile]=useState(null),[message,setMessage]=useState(''),[confirmed,setConfirmed]=useState(false);
 function apply(){try{onRecorded(adoptParcelObservations(payload,confirmed));setMessage('原件查閱值已套用至初評草稿；未改動分區、學區或其他章節，仍須完成正式核實。');setConfirmed(false);}catch(e){setMessage(e.message);}}
 const field=(key,label,type='text')=><label className="field"><span>{label}</span><input type={type} value={values[key]||''} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}/></label>;
 async function save(){try{if(!file)throw Error('請先選取官方截圖或文件原檔。');if(file.size>15*1024*1024)throw Error('原檔請小於15MB。');const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');const next=recordParcelObservation(payload,{...values,land_number:values.land_number||'',filename:file.name,sha256});onRecorded(next);setMessage('查閱值、原文與附件雜湊已記錄；待原件覆核，未自動確認分區、學區或完成調研。原檔請自行保留並隨調研附上。');}catch(e){setMessage(e.message);}}
 const count=[values.land_number,values.url,values.date,file,values.excerpt,values.area||values.village,values.longitude&&values.latitude].filter(Boolean).length;
 function selectFile(next){if(next&&!/^(image\/|application\/pdf$)/.test(next.type)&&! /\.(pdf|png|jpe?g|webp|gif|tiff?|heic)$/i.test(next.name)){setMessage('請選擇圖片或 PDF。');return;}setFile(next||null);setMessage('');}
 return <details className="utility-details"><summary>補入官方截圖／文件查閱紀錄 <small>官方資料 {count}／7</small></summary>
 <p>只填原件可讀的內容。原檔留在本機，系統只記錄查閱資料。</p>
 <fieldset className="intake-fields"><legend>來源與附件</legend>{field('land_number','附件完整地號')}{field('url','官方來源網址')}{field('date','實際查閱日期','date')}
 <div className="drop-file" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();selectFile(e.dataTransfer.files[0]);}}>
 <label className="btn">選擇圖片或 PDF<input className="visually-hidden" type="file" accept="image/*,application/pdf" aria-label="選擇圖片或 PDF" onChange={e=>{selectFile(e.target.files?.[0]);e.target.value='';}}/></label><p>也可將檔案拖放到這裡，單檔最多 15 MB。</p>
 {file&&<div className="file-name"><span>{file.name}</span><button className="btn" type="button" onClick={()=>selectFile(null)}>移除檔案</button></div>}</div></fieldset>
 <fieldset className="intake-fields"><legend>原文與基地資料</legend><label className="field"><span>原文摘錄（含地段地號及填入的資料）</span><textarea rows={5} value={values.excerpt||''} onChange={e=>setValues(v=>({...v,excerpt:e.target.value}))}/></label>{field('area','原件面積（平方公尺）','number')}{field('village','原件里別')}{field('longitude','原件經度（WGS84）','number')}{field('latitude','原件緯度（WGS84）','number')}</fieldset>
 <button className="btn primary" onClick={save}>記錄並儲存本案查閱資料</button><div><ul>{(payload.research_evidence?.claims||[]).filter(c=>['area','village','location'].includes(c.field)).map(c=><li key={c.field}>{({area:'面積',village:'里別',location:'座標'})[c.field]}：{c.value}（原件待覆核）</li>)}</ul><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我已對照原件，確認本案面積、里別及座標查閱值</label><button className="btn" onClick={apply} disabled={!confirmed||!payload.report_text}>核對後套用至初評草稿</button>{(!confirmed||!payload.report_text)&&<p>載入初評草稿並勾選已核對原件後，即可套用。</p>}<p>只套用已記錄的查閱欄位；不代表正式核實，不覆蓋已有不同值。</p></div><p role="status">{message}</p></details>;
}
