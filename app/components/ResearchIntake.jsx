'use client';
import {directionNotes,MAX_COMPARABLES} from '../../lib/researchIntake.mjs';
export default function ResearchIntake({value={},onChange,disabled,children}){
 const legacy=typeof value.urls==='string'?value.urls.trim().split(/\s+/).filter(Boolean):[];
 const urls=Array.isArray(value.urls)?value.urls:legacy;
 return <fieldset className="intake-fields" disabled={disabled}><legend>調研前作業｜基地四向與指定競案</legend>
  <label className="field"><span>基地四向現況（可用語音輸入）</span><textarea rows={4} maxLength={1000} value={directionNotes(value)} onChange={e=>onChange({...value,notes:e.target.value})} placeholder="例：東向臨○○路約8公尺，南向鄰三層透天，西向是空地，北向還沒量"/></label>
  <p className="muted">用裝置的語音輸入一次說完即可。調研時會從口述文字辨識各方向，沒提到的方向可留待確認。</p>
  {children}
  <details className="utility-details competitor-options"><summary>指定競案網址（選填）{urls.filter(v=>v.trim()).length ? ` · 已填 ${urls.filter(v=>v.trim()).length} 筆` : ''}</summary>
  {urls.length>MAX_COMPARABLES&&<p role="status">舊草稿超過五筆網址。請移除不需要的網址，直到剩下五筆。</p>}
  {urls.slice(0,MAX_COMPARABLES).map((url,i)=><div className="competitor-row" key={i}><label className="field"><span>競案網址 {i+1}</span><input type="url" maxLength={500} value={url} onChange={e=>onChange({...value,urls:urls.map((item,j)=>j===i?e.target.value:item)})} placeholder="https://market.591.com.tw/…"/></label><button type="button" className="btn" aria-label={'移除競案網址 '+(i+1)} onClick={()=>onChange({...value,urls:urls.filter((_,j)=>i!==j)})}>移除</button></div>)}
  <button type="button" className="btn" disabled={urls.length>=MAX_COMPARABLES} onClick={()=>onChange({...value,urls:[...urls,'']})}>＋新增競案網址</button>
  {urls.length>=MAX_COMPARABLES&&<small>最多五筆，移除現有網址後可再新增。</small>}
  </details>
 </fieldset>;
}
