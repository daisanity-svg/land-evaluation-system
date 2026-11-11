import {readFile} from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {validateTemplate} from './reportTemplate.mjs';
import {assessReportQuality} from './reportQuality.mjs';
import {buildLandEvaluationExcelBuffer} from './landEvaluationExcel.js';

let fontBytes;
// Draw the same populated workbook and merged-cell geometry; never reparse
// prose or infer prices separately for the owner PDF.
export async function buildOwnerBriefPdf(report){
 const missing=validateTemplate(report.report_text);
 if(missing.length)throw Error('報告欄位尚未齊全：'+missing.join('、'));
 const quality=assessReportQuality(report,{sourceChecks:report.summary?._source_checks||[]});
 if(quality.conflicts.length)throw Error('請先處理內容衝突：'+quality.conflicts.join('；'));
 const workbook=new ExcelJS.Workbook();
 await workbook.xlsx.load(await buildLandEvaluationExcelBuffer(report));
 const sheet=workbook.worksheets[0];
 const map=Array.from({length:sheet.rowCount},(_,i)=>i+1).find(i=>sheet.getCell('A'+i).text==='區域圖');
 const last=map||Math.min(33,sheet.rowCount);
 const widths=Array.from({length:10},(_,i)=>(sheet.getColumn(i+1).width||12)*7);
 const heights=Array.from({length:last},(_,i)=>sheet.getRow(i+1).height||20);
 const x=[0],y=[0];widths.forEach(n=>x.push(x.at(-1)+n));heights.forEach(n=>y.push(y.at(-1)+n));
 const w=595.28,h=841.89,pad=20;
 const scale=Math.min((w-2*pad)/x.at(-1),(h-2*pad-15)/y.at(-1));
 const left=(w-x.at(-1)*scale)/2,top=h-pad;
 const document=await PDFDocument.create();
 document.registerFontkit({create:bytes=>fontkit.create(bytes).getVariation({wght:400})});
 fontBytes||=await readFile(new URL('../assets/NotoSansTC.ttf',import.meta.url));
 const font=await document.embedFont(fontBytes,{subset:true});
 const page=document.addPage([w,h]);
 const ink=rgb(.10,.13,.16),border=rgb(.37,.42,.45);
 const merges=new Map(sheet.model.merges.map(range=>{
  const [,a,r,b,s]=range.match(/^([A-J])(\d+):([A-J])(\d+)$/);
  return [a+r,[b.charCodeAt(0)-64,Number(s)]];
 }));
 const charset=new Set(font.getCharacterSet());
 const textFor=cell=>cell.value instanceof Date?cell.value.toISOString().slice(0,10):cell.text;
 for(let row=1;row<=last;row++)for(let col=1;col<=10;col++){
  const cell=sheet.getCell(row,col);if(cell.type===ExcelJS.ValueType.Merge)continue;
  const [endCol,endRow]=merges.get(cell.address)||[col,row];
  const xp=left+x[col-1]*scale,yp=top-y[Math.min(endRow,last)]*scale;
  const width=(x[endCol]-x[col-1])*scale,height=(y[Math.min(endRow,last)]-y[row-1])*scale;
  const header=row===1||row===18||row===last;
  page.drawRectangle({x:xp,y:yp,width,height,borderWidth:.35,borderColor:border,color:header?rgb(.93,.96,.97):rgb(1,1,1)});
  const content=[...textFor(cell)].map(c=>c==='\n'||charset.has(c.codePointAt(0))?c:'?').join('');
  if(!content.trim())continue;
  const wrap=size=>content.split('\n').flatMap(line=>{
   const lines=[];let current='';
   for(const ch of line){if(current&&font.widthOfTextAtSize(current+ch,size)>width-5){lines.push(current);current=ch;}else current+=ch;}
   return [...lines,current];
  });
  let size=row===1?12:Math.min(9,Math.max(7,(cell.font?.size||11)*scale));
  let lines=wrap(size);
  while(lines.length*size*1.18>height-3&&size>6){size-=.25;lines=wrap(size);}
  if(lines.length*size*1.18>height-3)throw Error('簡表內容無法在一頁清楚顯示：'+cell.address);
  const centered=header||cell.alignment?.horizontal==='center';
  lines.forEach((line,i)=>page.drawText(line,{font,size,color:ink,
   x:centered?xp+(width-font.widthOfTextAtSize(line,size))/2:xp+2.5,
   y:yp+(height-lines.length*size*1.18)/2+(lines.length-i-1)*size*1.18+size*.2}));
 }
 page.drawText('未附本案位置圖', {font,size:7,color:ink,x:left+3,y:top-y.at(-1)*scale-10});
 document.setTitle(`${report.client||''} ${report.land_number||''} 土地評估簡表`);
 return Buffer.from(await document.save());
}
