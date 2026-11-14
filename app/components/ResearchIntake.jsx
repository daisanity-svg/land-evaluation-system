'use client';
import {DIRECTIONS} from '../../lib/researchIntake.mjs';
export default function ResearchIntake({value={},onChange,disabled}){
 return <fieldset disabled={disabled}><legend>調研前作業｜基地四向與指定競案</legend>
  <p className="muted">先填你量到的路寬、鄰房或鄰地現況。未確認的方向可留空。這些資料會跟地號一起帶到 ChatGPT。</p>
  <label className="field"><span>量測／觀察來源</span><select value={value.source||''} onChange={e=>onChange({...value,source:e.target.value})}><option value="">未填</option>{['樂居','國土測繪圖資服務雲','樂居及國土測繪圖資服務雲','其他人工量測／觀察'].map(x=><option key={x}>{x}</option>)}</select></label>
  <div className="adjustment-grid">{DIRECTIONS.map(side=><label className="field" key={side}><span>{side}向現況</span><input maxLength={250} value={value.sides?.[side]||''} onChange={e=>onChange({...value,sides:{...value.sides,[side]:e.target.value}})} placeholder="例：○○路約8公尺，或鄰三層透天"/></label>)}</div>
  <label className="field"><span>指定競案實價登錄網址（每行一筆）</span><textarea rows={3} maxLength={3000} value={value.urls||''} onChange={e=>onChange({...value,urls:e.target.value})} placeholder="https://market.591.com.tw/…"/></label>
 </fieldset>;
}
