import {reportForOutput} from './reportData.mjs';
import { readFile } from 'node:fs/promises';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { assessReportQuality } from './reportQuality.mjs';
import { validateTemplate } from './reportTemplate.mjs';
let fontBytes;
export async function buildLandEvaluationPdfBuffer(report) {
  const originalReport=report;
  report=reportForOutput(report);
  const text = String(report.report_text || '').replace(/\r\n?/g, '\n');
  if (text.length > 150000) throw Error('報告過長，請縮短後輸出。');
  const missing = validateTemplate(text);
  if (missing.length) throw Error('報告欄位尚未齊全：' + missing.join('、'));
  const quality = assessReportQuality(originalReport, { sourceChecks: report.summary?._source_checks || [] });
  if (quality.conflicts.length) throw Error('請先處理內容衝突：' + quality.conflicts.join('；'));
  fontBytes ||= await readFile(process.cwd() + '/assets/NotoSansTC.ttf');
  const doc = await PDFDocument.create(); doc.registerFontkit({create: bytes => fontkit.create(bytes).getVariation({wght:400})});
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle(`${report.client || '土地評估'}_${report.land_number || ''}_${report.research_date || ''}`);
  doc.setAuthor('丸獸品牌整合行銷');
  const width = 595.28, height = 841.89, left = 44, right = 44;
  const available = width - left - right, blue = rgb(.03,.32,.41), ink = rgb(.13,.18,.22);
  let page, y;
  function nextPage() {
    page = doc.addPage([width,height]); y = height - 58;
    page.drawText('丸獸品牌整合行銷｜土地評估', { x:left,y:height-31,size:10,font,color:blue });
    page.drawLine({start:{x:left,y:height-39},end:{x:width-right,y:height-39},thickness:.5,color:blue});
  }
  const charset = new Set(font.getCharacterSet());
  const safe = s => [...s.replace(/\t/g,'  ')].map(c => charset.has(c.codePointAt(0)) ? c : '?').join('');
  function lines(s,size,maxWidth=available) {
    const out=[]; let line='';
    for(const c of safe(s)) { if(line && font.widthOfTextAtSize(line+c,size)>maxWidth){out.push(line);line=c;} else line+=c; }
    if(line)out.push(line); return out;
  }
  function paragraph(s, heading=false) {
    const size=heading?13:10, leading=heading?21:16;
    const wrapped=lines(s,size);
    if(heading && y-(wrapped.length+2)*leading<55)nextPage();
    for(const line of wrapped){if(y<55)nextPage();page.drawText(line,{x:left,y,size,font,color:heading?blue:ink});y-=leading;}
    y-=heading?5:3;
  }
  nextPage(); paragraph(`${report.client || '土地評估'}｜${report.land_number || ''}`,true);
  paragraph('調研日期：' + (report.research_date || '未指定'));
  paragraph(quality.status==='preliminary'?'初評草稿｜核心資料或核實紀錄尚未齊全。':'內容與核實紀錄齊全｜待最終專業審閱。');
  y-=8;
  function table(rows) {
    const count=rows[0].length;
    const weights=count===3?[.15,.43,.42]:count===4?[.20,.17,.17,.46]:count===5?[.15,.23,.22,.18,.22]:Array(count).fill(1/count);
    const widths=weights.map(w=>w*available), size=9, leading=14, pad=6;
    function row(cells,header=false,from=0,to=null) {
      const wrapped=cells.map((s,i)=>lines(s,size,widths[i]-pad*2));
      const total=Math.max(1,...wrapped.map(v=>v.length));
      const end=to??total, height=(end-from)*leading+pad*2;
      let x=left;
      widths.forEach((w,i)=>{
        page.drawRectangle({x,y:y-height,width:w,height,color:header?rgb(.91,.95,.96):rgb(1,1,1),borderColor:rgb(.72,.79,.81),borderWidth:.5});
        wrapped[i].slice(from,end).forEach((value,j)=>page.drawText(value,{x:x+pad,y:y-pad-size-j*leading,size,font,color:header?blue:ink}));
        x+=w;
      });
      y-=height;
      return total;
    }
    const headerHeight=Math.max(...rows[0].map((s,i)=>lines(s,size,widths[i]-pad*2).length))*leading+pad*2;
    if(y<headerHeight+90)nextPage();
    row(rows[0],true);
    for(const cells of rows.slice(1)) {
      const total=Math.max(1,...cells.map((s,i)=>lines(s,size,widths[i]-pad*2).length));
      const rowHeight=total*leading+pad*2;
      // Keep ordinary rows together. Only oversized rows need continuation.
      if(rowHeight<=height-58-55-headerHeight && rowHeight>y-55){nextPage();row(rows[0],true);}
      let from=0;
      while(from<total) {
        let fits=Math.floor((y-55-pad*2)/leading);
        if(fits<1){nextPage();row(rows[0],true);fits=Math.floor((y-55-pad*2)/leading);}
        const to=Math.min(total,from+fits);
        row(cells,false,from,to);from=to;
      }
    }
    y-=10;
  }
  const sourceLines=text.split('\n');
  for(let i=0;i<sourceLines.length;i++) {
    const line=sourceLines[i];
    if(!line.trim()){y-=5;continue;}
    // Render actual tabular sections as cells, rather than printed pipe text.
    if(!/^\d{2}[｜|]|^競案[一二三四五六七八九十0-9]+[｜|]/.test(line)&&line.includes('｜')) {
      const cells=line.split('｜').map(s=>s.trim());
      if(cells.length>=3 && cells.length<=5) {
        const rows=[cells];
        while(i+1<sourceLines.length && sourceLines[i+1].split('｜').length===cells.length)rows.push(sourceLines[++i].split('｜').map(s=>s.trim()));
        if(rows.length>1){table(rows);continue;}
      }
    }
    paragraph(line,/^\d{2}[｜|]|^競案[一二三四五六七八九十0-9]+[｜|]/.test(line));
  }
  const pages=doc.getPages();
  pages.forEach((p,i)=>{p.drawLine({start:{x:left,y:39},end:{x:width-right,y:39},thickness:.4,color:blue});p.drawText(`丸獸品牌整合行銷｜${i+1} / ${pages.length}`,{x:left,y:25,size:8,font,color:ink});});
  return Buffer.from(await doc.save());
}
