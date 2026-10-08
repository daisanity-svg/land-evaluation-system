// Server-only, read-only retrieval. Never accept a caller's verified=true flag.
const norm=x=>String(x||'').normalize('NFKC').replace(/\s+/g,'').replace(/台/g,'臺');
export function sourceKey(field,value,s) {return JSON.stringify([field,value,s.url,s.raw_value,s.subject,...(s.calculation ? [s.calculation] : [])]);}
export function safeSourceUrl(value) {
  try {const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
    const h=u.hostname.toLowerCase();
    if(!/(?:^|\.)gov\.tw$|(?:^|\.)(?:591\.com\.tw|leju\.com\.tw|tymetro\.com\.tw|edu\.tw)$/.test(h))return null;
    return u.href;
  }catch{return null;}
}
export function visibleText(html) {
  return html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
async function readPage(url,fetcher) {
  const signal=AbortSignal.timeout(6000);
  let response,current=url;
  for(let redirects=0;redirects<=2;redirects++){
    response=await fetcher(current,{redirect:'manual',cache:'no-store',signal,headers:{Accept:'text/html,application/json,text/plain,text/csv'}});
    if(![301,302,303,307,308].includes(response.status))break;
    const location=response.headers.get('location');
    const target=location&&safeSourceUrl(new URL(location,current).href);
    if(!target||redirects===2)throw Error('來源重新導向不安全或超過上限');
    await response.body?.cancel();current=target;
  }
  if(!response.ok)throw Error('來源回應'+response.status);
  const type=response.headers.get('content-type')||'';
  if(!/text\/|application\/json/i.test(type))throw Error('來源格式須人工查閱（PDF、圖片或附件）');
  const reader=response.body?.getReader();if(!reader)throw Error('來源無可讀正文');
  let size=0;const chunks=[];
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1500000)throw Error('來源超過讀取上限');chunks.push(value);}}finally{await reader.cancel();}
  const all=new Uint8Array(size);let pos=0;for(const chunk of chunks){all.set(chunk,pos);pos+=chunk.length;}
  const raw=new TextDecoder().decode(all);
  const body=/text\/html/i.test(type)?visibleText(raw):raw;
  if(/verify you are human|checking your browser|access denied|captcha|驗證您是人類/i.test(body))throw Error('來源受驗證或存取限制');
  return norm(body);
}
export async function verifySourcePages(evidence,{fetcher=fetch}={}) {
  const candidates=(Array.isArray(evidence?.claims)?evidence.claims:[]).filter(c=>c&&typeof c==='object').flatMap(c=>(Array.isArray(c.sources)?c.sources:[]).filter(s=>s&&typeof s==='object').map(s=>({c,s}))).slice(0,60);
  const pages=new Map(),checks=[];let reads=0;
  // Four concurrent reads; bounded URL count and timeout keep the report route usable.
  for(let i=0;i<candidates.length;i+=4)await Promise.all(candidates.slice(i,i+4).map(async({c,s})=>{
    const key=sourceKey(c.field,c.value,s),url=safeSourceUrl(s.url),quote=norm(s.raw_value),subject=norm(s.subject);
    let reason='';
    if(!url)reason='來源非允許的公開來源，須人工複核';
    else if(quote.length<12||quote.length>600||subject.length<2)reason='缺少原文摘錄或標的識別';
    else if(!quote.includes(subject))reason='原文摘錄未包含本項標的';
    else if(s.calculation){
      const d=s.calculation, input=Number(d.input_m2), precision=d.precision;
      const expected=Number((input*.3025).toFixed(Number.isInteger(precision)&&precision>=0&&precision<=4?precision:2));
      const adopted=norm(c.value).match(/^(\d+(?:\.\d+)?)坪$/);
      const numericQuote=[...quote.matchAll(/(\d+(?:\.\d+)?)\s*(?:m2|平方公尺)/gi)].map(m=>Number(m[1]));
      if(c.field!=='area'||d.type!=='m2_to_ping'||typeof d.input_m2!=='number'||!Number.isFinite(input)||input<=0||!Number.isInteger(precision)||precision<0||precision>4||!adopted||Number(adopted[1])!==expected||!numericQuote.includes(input)||!/(?:㎡|m2|平方公尺)/i.test(quote))reason='面積換算缺少原始㎡、合法公式或採用值不符';
    }
    else if(!quote.includes(norm(c.value)))reason='原文摘錄未包含本項採用值';
    if(reason){checks.push({key,verified:false,reason});return;}
    try {
      if(!pages.has(url)){if(reads>=24)throw Error('來源查閱上限，須分批複核');reads++;pages.set(url,readPage(url,fetcher));}
      const body=await pages.get(url);const verified=body.includes(quote);
      checks.push({key,verified,reason:verified?'已讀取原文並匹配標的與摘錄':'未在來源正文找到本項摘錄',checked_at:new Date().toISOString()});
    }catch(e){checks.push({key,verified:false,reason:e.message});}
  }));
  return checks;
}
