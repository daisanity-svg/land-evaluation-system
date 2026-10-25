import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {canonicalSummary,reportForOutput,transactionCount,priceCards} from '../lib/reportData.mjs';
import {checkpointPayload,saveCheckpoint,loadCheckpoint} from '../lib/researchCheckpoint.mjs';
import {recordParcelObservation} from '../lib/parcelObservation.mjs';
import {buildLandEvaluationExcelBuffer} from '../lib/landEvaluationExcel.js';
import {buildLandEvaluationPdfBuffer} from '../lib/landEvaluationPdf.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/fulin192-regression.json',import.meta.url),'utf8'));
assert.equal(canonicalSummary(fixture.report_text,{summary:{area:'25坪'}}).area,'待複核');
assert.equal(transactionCount('591與樂居標示全歷史151筆，近半年待複核'),null);
assert.equal(transactionCount('樂居全歷史23筆，不等於近半年有效住宅筆數'),null);
assert.equal(transactionCount('12筆樣本，全期尚未確認'),12);
const p=reportForOutput(fixture);assert.match(p.summary.conclusion,/尚無法判斷/);assert.doesNotMatch(p.report_text,/最終結論：暫緩/);
const cards=priceCards(p.report_text.split('09｜價格預判')[1].split('10｜產品規劃建議')[0]);assert.equal(cards.cards.length,3);assert.ok(cards.cards.every(c=>!c.lines.some(x=>x.includes('價格判斷摘要'))));assert.match(cards.summary,/住宅須由/);
const buffer=await buildLandEvaluationExcelBuffer(fixture),book=new ExcelJS.Workbook();await book.xlsx.load(buffer);const s=book.worksheets[0];
assert.equal(s.getCell('F4').value,'待複核');
for(const cell of ['J19','J20']){assert.match(s.getCell(cell).value,/期間筆數待複核/);assert.doesNotMatch(s.getCell(cell).value,/591筆|23筆/);}
assert.match(s.getCell('G20').value,/25.02萬\/坪\n一年指標/);
const full=book.getWorksheet('評估全文').getSheetValues().flat().join('\n');assert.match(full,/尚無法判斷開發可行性/);assert.match(full,/全歷史23筆/);
const db=new Map(),storage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};
const checkpoint=checkpointPayload({landNumber:fixture.land_number,researchDate:fixture.research_date,client:'驗收',reportText:fixture.report_text,returnToken:'secret'},'test-fulin192');
saveCheckpoint(storage,{...checkpoint,return_token:'secret'});assert.ok(![...db.values()].join('').includes('secret'));assert.equal(loadCheckpoint(storage,'test-fulin192','另一段192地號'),null);assert.equal(loadCheckpoint(storage,'test-fulin192',fixture.land_number).payload.report_text,fixture.report_text);
const observation={land_number:fixture.land_number,url:'https://maps.nlsc.gov.tw/T09/mobilemap.action',date:'2026-10-25',sha256:'a'.repeat(64),filename:'official.png',excerpt:'桃園市平鎮區福林里 平鎮所(HG1252)福林段192地號 面積2050.47平方公尺，經緯度121.218279,24.904277。',area:'2050.47',village:'福林里',longitude:'121.218279',latitude:'24.904277'};
const recorded=recordParcelObservation(checkpoint,observation);assert.equal(recorded.research_evidence.claims[0].value,'2050.47㎡，約620.27坪');assert.ok(recorded.research_evidence.claims.every(c=>!c.verified&&c.sources[0].observation.status==='needs_manual_review'));assert.equal(recorded.research_evidence.claims.length,3);
assert.throws(()=>recordParcelObservation(checkpoint,{...observation,land_number:'他段1地號'}));assert.throws(()=>recordParcelObservation(checkpoint,{...observation,area:'25'}));
if(process.env.REGRESSION_OUTPUT){await writeFile(process.env.REGRESSION_OUTPUT+'/fulin192-fixed.xlsx',buffer);await writeFile(process.env.REGRESSION_OUTPUT+'/fulin192-fixed.pdf',await buildLandEvaluationPdfBuffer(fixture));}
console.log('Fulin192 actual regression: no invented area/counts; annual label, independent price summary, draft decision, exact-case recovery and unverified manual evidence passed.');
