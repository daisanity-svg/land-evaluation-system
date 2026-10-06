'use client';
import {useState} from 'react';
import {applyReportAdjustments} from '../../lib/reportAdjustments.mjs';
export default function ReportAdjustments({text,onApply}) {
 const [values,setValues]=useState({}),[message,setMessage]=useState('');
 const field=(key,label,placeholder='')=><label className="field" key={key}><span>{label}</span><input value={values[key]||''} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))} placeholder={placeholder}/></label>;
 const apply=()=>{try{const updated=applyReportAdjustments(text,values);onApply(updated);setValues({});setMessage('已套用至報告；PDF與Excel將採用相同內容。修改項目需重新核實。');}catch(e){setMessage(e.message)}};
 return <details className="utility-details"><summary>調整價格、產品與基地條件</summary><p className="muted">有核實依據再修改。套用後同步更新報告與輸出檔，原核實紀錄會失效。</p><div className="adjustment-grid">{field('residential','二樓以上住宅','例如：60萬／坪')}{field('shop','店面','例如：80萬／坪')}{field('parking','坡道平面車位','例如：200萬／位')}{field('twoRoomMin','兩房最小坪數')}{field('twoRoomMax','兩房最大坪數')}{field('threeRoomMin','三房最小坪數')}{field('threeRoomMax','三房最大坪數')}</div><label className="field"><span>臨路條件</span><textarea rows={2} value={values.road||''} onChange={e=>setValues(v=>({...v,road:e.target.value}))}/></label><div className="adjustment-grid">{['東向','南向','西向','北向'].map(key=>field(key,key+'｜現況與銷售影響','現況｜對銷售影響'))}</div><button className="btn" onClick={apply}>套用至報告與輸出檔</button>{message&&<p role="status" className="muted">{message}</p>}</details>;
}
