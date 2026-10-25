'use client';
import { useEffect, useState } from 'react';
export default function ParcelLocation({landNumber,onResolved}) {
  const [result,setResult]=useState(null); const [message,setMessage]=useState('');
  useEffect(()=>{
    setResult(null); setMessage(''); if(!landNumber.trim()) return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setMessage('正在核對官方地段代碼…');
      try { const response=await fetch('/api/land-parcels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({land_number:landNumber}),signal:controller.signal}); const data=await response.json(); if(!response.ok) throw Error(data.message); if(!controller.signal.aborted){setResult(data);onResolved?.(data);setMessage('官方地段代碼已核對；宗地位置與範圍尚待讀取圖臺確認。');} }
      catch(error){if(!controller.signal.aborted)setMessage(error.message || '地號查詢失敗。');}
    },800);
    return()=>{clearTimeout(timer);controller.abort();};
  },[landNumber]);
  if(!landNumber.trim())return null;
  return <details className="utility-details no-print"><summary>地號核對與官方圖資</summary><div aria-live="polite"><p>{message}</p>{result&&<><p>{result.parcels.map(p=>`${p.section}${p.land_number}地號（${p.parcel_code}）`).join('、')}</p><a className="fallback-link" href={result.official_map_url} target="_blank" rel="noreferrer">開啟官方地籍圖</a>{'　'}<a className="fallback-link" href={result.official_imagery_url} target="_blank" rel="noreferrer">開啟官方航照圖</a><h3>查詢受阻時接續官方入口</h3>{result.official_query_routes?.map(r=><p key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.label}</a></p>)}<p>請在官方圖臺選擇本案地段與地號，讀取土地資訊。代碼查詢未取得面積、分區或宗地範圍；已有截圖時可使用下方查閱紀錄接續。</p></>}</div></details>;
}
