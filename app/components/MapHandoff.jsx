'use client';
import {useState} from 'react';
import {buildMapHandoff,CHATGPT_HOME,MAP_APP} from '../../lib/mapHandoff.mjs';

export default function MapHandoff({landNumber,intake}){
 const [result,setResult]=useState(null);
 async function copy(text){
  try{await navigator.clipboard.writeText(text);return true;}catch{return false;}
 }
 async function launch(){
  let text;
  try{text=buildMapHandoff(landNumber,intake);}catch(error){setResult({error:error.message});return;}
  let opened=false;
  try{
   const tab=window.open('about:blank','_blank');
   if(tab){tab.opener=null;tab.location.replace(CHATGPT_HOME);opened=true;}
  }catch{}
  setResult({text,opened,copied:null});
  const copied=await copy(text);
  setResult(previous=>previous?.text===text?{...previous,copied}:previous);
 }
 return <div>
  <button type="button" className="btn primary start-research" onClick={launch}>製作地圖</button>
  {result?.error&&<p role="alert">{result.error}</p>}
  {result?.text&&<>
   <p role="status">{result.opened?'已開啟 ChatGPT 新分頁。':'新分頁未開啟。'}{result.copied===true?'交接內容已複製。':result.copied===false?'無法自動複製，請全選下方內容。':''}請切到工作模式，用 @ 選取「{MAP_APP}」，貼上後送出。</p>
   {!result.opened&&<a href={CHATGPT_HOME} target="_blank" rel="noopener noreferrer">開啟 ChatGPT</a>}
   <label className="field"><span>製圖交接內容</span><textarea readOnly rows={4} value={result.text}/></label>
   <button type="button" className="btn" onClick={async()=>{const text=result.text,copied=await copy(text);setResult(previous=>previous?.text===text?{...previous,copied}:previous);}}>重新複製</button>
  </>}
 </div>;
}
