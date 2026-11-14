'use client';
import {directionNotes,MAX_COMPARABLES} from '../../lib/researchIntake.mjs';
export default function ResearchIntake({value={},onChange,disabled}){
 const legacy=typeof value.urls==='string'?value.urls.trim().split(/\s+/).filter(Boolean):[];
 const urls=Array.isArray(value.urls)?value.urls:legacy;
 return <fieldset disabled={disabled}><legend>調研前作業｜基地四向與指定競案</legend>
  <label className="field"><span>基地四向現況（可用語音輸入）</span><textarea rows={4} maxLength={1000} value={directionNotes(value)} onChange={e=>onChange({...value,notes:e.target.value})} placeholder="例：東向臨○○路約8公尺，南向鄰三層透天，西向是空地，北向還沒量"/></label>
  <p className="muted">用裝置的語音輸入一次說完即可。調研時會從口述文字辨識各方向，沒提到的方向可留待確認。</p>
  <p>指定競案實價登錄網址（選填）</p>
  {urls.length>MAX_COMPARABLES&&<p role="status">舊草稿超過五筆網址。請編輯任一格，確認只保留目前顯示的五筆。</p>}
  {Array.from({length:MAX_COMPARABLES},(_,i)=><label className="field" key={i}><span>競案網址 {i+1}</span><input type="url" maxLength={500} value={urls[i]||''} onChange={e=>{const next=Array.from({length:MAX_COMPARABLES},(_,j)=>j===i?e.target.value:urls[j]||'');onChange({...value,urls:next});}} placeholder="https://market.591.com.tw/…"/></label>)}
 </fieldset>;
}
