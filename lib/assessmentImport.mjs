import {createHash} from 'node:crypto';
import ExcelJS from 'exceljs';

const fields={B3:'location',B4:'zoning',F4:'area',B5:'coverage',F5:'far',B6:'road',F7:'village',B16:'market',B17:'product'};
const supported=/\.(xlsx|pdf|png|jpe?g)$/i;
function candidatesFromLines(lines){
 const labels={基地位置:'location',標的位置:'location',土地使用分區:'zoning',土地分區:'zoning',基地面積:'area',法定建蔽率:'coverage',建蔽率:'coverage',法定容積率:'far',容積率:'far',臨路條件:'road',里別:'village',鄰別:'neighborhood',基礎教育學區:'schoolPrimary',中等教育學區:'schoolSecondary',區域銷況:'market',建議產品:'product'};
 return lines.flatMap(line=>{
  const m=line.match(/^([^：:]{1,12})[：:]\s*(.{1,300})$/);
  return m&&Object.hasOwn(labels,m[1])?[{field:labels[m[1]],value:m[2]}]:[];
 });
}
export async function extractAssessmentAttachment(bytes,filename){
 const match=filename.match(supported);
 if(!match||bytes.length>3500000||!bytes.length)throw Error('僅接受 3.5 MB 以內的 Excel、PDF 或基地圖');
 const kind=match[1].toLowerCase(),source={filename,sha256:createHash('sha256').update(bytes).digest('hex')};
 let landNumber='',candidates=[],excerpt='',notice='';
 if(kind==='xlsx'){
  const w=new ExcelJS.Workbook();await w.xlsx.load(bytes);
  const s=w.worksheets.find(sheet=>/土地評估分析表/.test(sheet.getCell('A1').text));
  if(!s)throw Error('找不到既有土地評估母版，請確認附件格式');
  const expected={A3:'標的位置',A4:'土地分區',E4:'基地面積',A6:'臨路條件',A16:'區域銷況',A17:'建議產品'};
  if(Object.entries(expected).some(([cell,v])=>s.getCell(cell).text.trim()!==v))throw Error('附件欄位位置與母版不符');
  landNumber=s.getCell('F3').text.trim();
  if(!landNumber)throw Error('附件未載明地號');
  candidates=Object.entries(fields).map(([address,field])=>({field,value:s.getCell(address).text.trim(),locator:address}));
  const prices=Array.from({length:Math.min(s.rowCount,100)},(_,i)=>i+1).find(r=>s.getCell('B'+r).text==='二樓以上住宅'&&s.getCell('F'+r).text==='店面'&&s.getCell('F'+(r+1)).text==='坡道平面車位');
  if(prices)candidates.push(...[['D'+prices,'residentialPrice'],['H'+prices,'shopPrice'],['H'+(prices+1),'parkingPrice']].map(([locator,field])=>({field,locator,value:s.getCell(locator).text.trim()})));
  const dir={'東向':'east','南向':'south','西向':'west','北向':'north'};
  for(let i=9;i<=12;i++)if(Object.hasOwn(dir,s.getCell('B'+i).text))candidates.push({field:dir[s.getCell('B'+i).text],value:s.getCell('C'+i).text.trim(),locator:'C'+i});
 }else if(kind==='pdf'){
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:Uint8Array.from(bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:true});
  try {
   const doc=await task.promise;
   if(doc.numPages>20)throw Error('PDF 最多接受 20 頁');
   const lines=[];
   for(let i=1;i<=doc.numPages;i++){
    const page=await doc.getPage(i),content=await page.getTextContent();
    // Keep native line order, and do not join across pages.
    let line='';
    for(const item of content.items){if(!('str' in item))continue;line+=(line?' ':'')+item.str;if(item.hasEOL){lines.push(line.trim());line='';}}
    if(line)lines.push(line.trim());page.cleanup();
   }
   excerpt=lines.join('\n').slice(0,12000);
   landNumber=lines.find(l=>/^(標的地號|目標地號)[：:]/.test(l))?.replace(/^[^：:]+[：:]\s*/,'')||'';
   candidates=candidatesFromLines(lines);
   if(!candidates.length)notice='已讀取 PDF 文字；欄位排列或掃描內容無法可靠自動配對，請查看原文後人工確認。';
  }finally{await task.destroy();}
 }else{
  const valid=kind==='png'?bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!valid)throw Error('基地圖檔案格式不正確');
  notice='基地圖已記錄檔案識別；目前須依圖面手動確認地號、四向與標示值。';
 }
 return {source,landNumber,excerpt,notice,candidates:candidates.filter(c=>c.value&&c.value.length<=300&&!/[\r\n]/.test(c.value)).map(c=>({...c,status:'unknown'}))};
}
