'use client';
import { useRef, useState } from 'react';
import Ajv from 'ajv';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import schema from '../02_Data_Model_JSON_Schema.json';
import JsonForm from '../components/JsonForm';
import ReportPreview from '../components/ReportPreview';
import { baseData, deepMergeWithDefault, formatPdfFileName } from '../lib/defaultData';

export default function Home(){
  const [data,setData]=useState(baseData);
  const [input,setInput]=useState('');
  const [msg,setMsg]=useState('');
  const ajv=new Ajv({allErrors:true});
  const previewRef=useRef(null);

  const importJson=()=>{
    try{
      const parsed=JSON.parse(input);
      const merged=deepMergeWithDefault(parsed,baseData);
      const ok=ajv.validate(schema, merged);
      if(!ok) return setMsg(`JSON 驗證失敗: ${ajv.errors?.map(e=>`${e.instancePath} ${e.message}`).join('; ')}`);
      setData(merged); setMsg('JSON 匯入成功');
    }catch(e){setMsg(`JSON 格式錯誤: ${e.message}`)}
  };

  const exportJson=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='land-evaluation-export.json'; a.click();
  };

  const exportPdf=async()=>{
    if(!previewRef.current) return;
    const canvas=await html2canvas(previewRef.current,{scale:2});
    const img=canvas.toDataURL('image/png');
    const pdf=new jsPDF('l','mm','a4');
    pdf.addImage(img,'PNG',0,0,297,210);
    pdf.save(formatPdfFileName(data));
  };

  return <main>
    <h1>海悅廣告｜土地評估系統（MVP）</h1>
    <div className='grid2'>
      <section className='panel'>
        <h2>JSON 匯入</h2>
        <textarea style={{height:160}} value={input} onChange={e=>setInput(e.target.value)} placeholder='貼上 ChatGPT 產生的 JSON' />
        <div style={{display:'flex',gap:8,margin:'8px 0'}}>
          <button className='btn' style={{background:'#2563eb'}} onClick={importJson}>驗證並套用</button>
          <button className='btn' style={{background:'#334155'}} onClick={exportJson}>匯出 JSON</button>
          <button className='btn' style={{background:'#059669'}} onClick={exportPdf}>下載 PDF</button>
        </div>
        <p>{msg}</p>
        <h2>可編輯欄位（全欄位）</h2>
        <JsonForm data={data} setData={setData}/>
      </section>
      <section className='panel'>
        <h2>即時預覽</h2>
        <div ref={previewRef}><ReportPreview data={data}/></div>
      </section>
    </div>
  </main>
}
