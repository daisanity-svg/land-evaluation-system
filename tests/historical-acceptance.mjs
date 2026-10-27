// Historical inputs are immutable regression evidence, not newly verified research.
import assert from 'node:assert/strict';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {validateTemplate} from '../lib/reportTemplate.mjs';
import {assessReportQuality} from '../lib/reportQuality.mjs';
import {reportForOutput,reportSections} from '../lib/reportData.mjs';
import {buildLandEvaluationExcelBuffer} from '../lib/landEvaluationExcel.js';
import {buildLandEvaluationPdfBuffer} from '../lib/landEvaluationPdf.mjs';
const directory=new URL('./fixtures/historical-acceptance/',import.meta.url);
const output=process.env.HISTORICAL_OUTPUT;
if(output)await mkdir(output,{recursive:true});
const results=[];
for(const file of (await readdir(directory)).filter(x=>x.endsWith('.json')).sort()) {
 const {payload:p,provenance}=JSON.parse(await readFile(new URL(file,directory),'utf8'));
 assert.equal(provenance.research_revalidated,false);
 const template=validateTemplate(p.report_text),quality=assessReportQuality(p),normalized=reportForOutput(p);
 const names=[...(reportSections(p.report_text)['08']||'').matchAll(/^\s*競案[一二三四五六七八九十0-9]+[｜|]([^\n]+)/gm)].map(m=>m[1].trim());
 const r={case:p.land_number,source:provenance.source,template_missing:template,quality:quality.status,missing:quality.missing_core_fields,conflicts:quality.conflicts,source_verified:quality.source_verification_complete,comparable_names:names,export:'not_run',full_web_workflow:'not_tested',research_revalidated:false};
 // Incomplete historical reports must never become verified by export alone.
 assert.notEqual(quality.status,'ready_for_review',p.land_number+' unexpectedly promoted');
 try {
  const excel=await buildLandEvaluationExcelBuffer(p),book=new ExcelJS.Workbook();await book.xlsx.load(excel);
  const full=book.getWorksheet('評估全文').getSheetValues().flat().filter(x=>x!=null).join('\n');
  for(const line of normalized.report_text.split('\n').filter(Boolean))assert.ok(full.includes(line),'Full-text loss: '+line.slice(0,60));
  const cards=[19,20,21,22].map(n=>String(book.worksheets[0].getCell('C'+n).value||''));
  for(const name of names.slice(0,4))assert.ok(cards.includes(name),'Comparable missing: '+name);
  const pdf=await buildLandEvaluationPdfBuffer(p);assert.ok(pdf.length>1000);
  r.export='passed';r.excel_area=book.worksheets[0].getCell('F4').value;r.card_names=cards;r.conclusion=normalized.summary.conclusion;
  if(output){const base=file.replace('.json','');await writeFile(output+'/'+base+'.xlsx',excel);await writeFile(output+'/'+base+'.pdf',pdf);}
 }catch(e){r.export='blocked_or_failed';r.export_error=e.message;}
 results.push(r);
}
assert.equal(results.length,7);
if(output)await writeFile(output+'/results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
if(results.some(x=>x.export==='blocked_or_failed'&&!x.conflicts.length&&!x.template_missing.length))process.exitCode=1;
