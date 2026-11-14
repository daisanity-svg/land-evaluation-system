import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {PDFDocument} from 'pdf-lib';
import {extractAssessmentAttachment} from '../lib/assessmentImport.mjs';
import {applyConfirmedFields,updateWorkingFields,workingConflicts,readWorkValues} from '../lib/ownerAssessment.mjs';
import {assessReportQuality} from '../lib/reportQuality.mjs';
import {buildLandEvaluationExcelBuffer} from '../lib/landEvaluationExcel.js';
import {buildLandEvaluationPdfBuffer} from '../lib/landEvaluationPdf.mjs';

const [xlsx,json,out]=process.argv.slice(2);
if(!xlsx||!json||!out)throw Error('Usage: node tests/east-garden-owner-acceptance.mjs workbook.xlsx payload.json output-directory');
const input=await extractAssessmentAttachment(await readFile(xlsx),'owner-reference.xlsx');
const historical=JSON.parse(await readFile(json,'utf8'));
assert.match(historical.land_number,/47-5/);
assert.equal(input.landNumber.replace(/\s/g,''),historical.land_number.replace(/\s/g,''));
const selected=['residentialPrice','shopPrice','parkingPrice','village','schoolPrimary','schoolSecondary'];
const changes=input.candidates.filter(c=>selected.includes(c.field)).map(({field,value})=>({field,value:['village','schoolPrimary','schoolSecondary'].includes(field)?value+'（人工工作值）':value,source:'業主 Excel 回歸附件',reason:'核對跨表同步；不代表已核實'}));
assert.equal(changes.length,6);
assert.deepEqual(changes.filter(c=>c.field.endsWith('Price')).map(c=>Number(c.value.match(/\d+/)[0])),[30,36,180]);
const output=applyConfirmedFields({...historical,report_id:'fixture-east-garden'},changes);
output.summary._working_fields=updateWorkingFields({},changes,{actor:'local-regression'});
assert.equal(workingConflicts(output.summary._working_fields,historical.report_text).length,6);
assert.deepEqual(workingConflicts(output.summary._working_fields,output.report_text),[]);
assert.equal(readWorkValues(output.report_text).residentialPrice,output.summary.price);
assert.equal(assessReportQuality(output).status,'preliminary');
assert.deepEqual(assessReportQuality(output).conflicts,[]);
const workbook=await buildLandEvaluationExcelBuffer(output),book=new ExcelJS.Workbook();
await book.xlsx.load(workbook);
const sheet=book.worksheets[0];
for(const [row,name] of [[19,'日勝好日子'],[20,'臻璞'],[21,'立鴻晶硯']]){
 assert.equal(sheet.getCell('C'+row).text,name);assert.ok(String(sheet.getCell('J'+row).note).startsWith(name+'｜'));
}
assert.equal(new Set([19,20,21].map(n=>sheet.getCell('J'+n).note.split('｜')[1])).size,3);
for(const [cell,num] of [['D23',30],['H23',36],['H24',180]])assert.match(sheet.getCell(cell).text,new RegExp(num+'.*人工工作值'));
assert.match(sheet.getCell('B7').text,/大園國小.*人工工作值/s);
assert.match(sheet.getCell('B7').text,/大園國中.*人工工作值/s);
assert.match(sheet.getCell('F7').text,/橫峰里.*人工工作值/s);
for(const [cell,value] of [['B4','住宅區'],['B5','60%'],['F5','200%']]){
 assert.equal(sheet.getCell(cell).text,`${value}\n（待複核）`);
}
assert.match(sheet.getCell('G19').text,/29\.24.*9筆樣本/s);
assert.match(sheet.getCell('G20').text,/半年樣本 1筆.*30\.60.*一年樣本 6筆.*29\.65/s);
assert.match(sheet.getCell('G21').text,/30\.95.*2筆樣本均價.*全期待複核/s);
assert.equal(sheet.pageSetup.fitToPage,true);
assert.equal(sheet.pageSetup.fitToHeight,1);
assert.match(sheet.getCell('A34').text,/未附本案位置圖/);
assert.ok(Array.from({length:13},(_,i)=>sheet.getRow(i+34).height).reduce((a,b)=>a+b,0)<60);
const pdf=await buildLandEvaluationPdfBuffer(output);
assert.ok((await PDFDocument.load(pdf)).getPageCount()>1);
await mkdir(out,{recursive:true});
await Promise.all([writeFile(out+'/east-garden-draft.xlsx',workbook),writeFile(out+'/east-garden-full-draft.pdf',pdf),writeFile(out+'/east-garden-draft.txt',output.report_text)]);
console.log('East Garden real reference: identity, six manual values, protected research return, three distinct comparable notes and Excel/PDF generation passed. No writes to a live report.');
