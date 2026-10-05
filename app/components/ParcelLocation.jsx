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
  return <div className="sync-box no-print" aria-live="polite"><strong>基地地號定位</strong><p>{message}</p>{result&&<><p>{result.parcels.map(p=>`${p.section}${p.land_number}地號（${p.parcel_code}）`).join('、')}</p><a className="fallback-link" href={result.official_map_url} target="_blank" rel="noreferrer">開啟官方地籍圖</a>{'　'}<a className="fallback-link" href={result.official_imagery_url} target="_blank" rel="noreferrer">開啟官方航照圖</a></>}</div>;
}
