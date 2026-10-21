import { readFile } from 'node:fs/promises';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { assessReportQuality } from './reportQuality.mjs';
import { validateTemplate } from './reportTemplate.mjs';
let fontBytes;
export async function buildLandEvaluationPdfBuffer(report) {
  const text = String(report.report_text || '').replace(/\r\n?/g, '\n');
  if (text.length > 150000) throw Error('報告過長，請縮短後輸出。');
  const missing = validateTemplate(text);
  if (missing.length) throw Error('報告欄位尚未齊全：' + missing.join('、'));
  const quality = assessReportQuality(report, { sourceChecks: report.summary?._source_checks || [] });
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
  function lines(s,size) {
    const out=[]; let line='';
    for(const c of safe(s)) { if(line && font.widthOfTextAtSize(line+c,size)>available){out.push(line);line=c;} else line+=c; }
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
  for(const line of text.split('\n')) {
    if(!line.trim()){y-=5;continue;}
    paragraph(line,/^\d{2}[｜|]|^競案[一二三四五六七八九十0-9]+[｜|]/.test(line));
  }
  const pages=doc.getPages();
  pages.forEach((p,i)=>{p.drawLine({start:{x:left,y:39},end:{x:width-right,y:39},thickness:.4,color:blue});p.drawText(`丸獸品牌整合行銷｜${i+1} / ${pages.length}`,{x:left,y:25,size:8,font,color:ink});});
  return Buffer.from(await doc.save());
}
