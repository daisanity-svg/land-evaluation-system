import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ExcelJS from 'exceljs';
import {PDFDocument} from 'pdf-lib';
import {buildLandEvaluationExcelBuffer} from '../lib/landEvaluationExcel.js';
import {buildLandEvaluationPdfBuffer} from '../lib/landEvaluationPdf.mjs';
import {GET as readiness} from '../app/api/readiness/route.js';
import {OWNER_RESEARCH_POLICY} from '../lib/ownerResearchPolicy.mjs';

const page=await readFile(new URL('../app/page.jsx',import.meta.url),'utf8');
const split=page.split('\n').find(l=>l.startsWith('function splitCardsByKeywords'));
const context=vm.createContext({normalize:s=>s,stripLabelWords:s=>s.trim()});vm.runInContext(split,context);
const cards=context.splitCardsByKeywords('競案一｜甲案\n建設公司：甲建設\n競案等級：直接競案\n競案二｜乙案\n競案等級：產品參考\n市場行情總結：兩案分開統計',['競案資料卡','競案','案名','市場行情總結']);
assert.equal(cards.length,3);assert.ok(cards[0].includes('競案等級：直接競案'));

const body=`08｜競案分級與市場行情
競案一｜合成樣本
案子規劃：2+1房及三房25至39坪
屋齡：預售，預計2029年第二季度交屋，尚待核對完工狀態。
成交期間：2026-04-01至2026-10-21
成交筆數：12筆樣本，全期尚未確認
成交價格：60.87萬／坪（12筆樣本）
車位類型：坡道平面
車位價格：212.5萬／位（12位樣本）
統計備註：本次為補充樣本，非全期完整行情。`;
const book=new ExcelJS.Workbook();await book.xlsx.load(await buildLandEvaluationExcelBuffer({report_text:body}));
const sheet=book.worksheets[0];
assert.equal(sheet.getCell('E19').value,'2+1房、3房');
assert.match(sheet.getCell('G19').value,/12筆樣本/);
assert.match(sheet.getCell('J19').value,/2026-04-01/);
const full=book.getWorksheet('成交統計');assert.ok(full);
assert.ok(full.getSheetValues().flat().some(v=>typeof v==='string'&&v.includes('2026-04-01至2026-10-21')));
assert.ok(full.getSheetValues().flat().some(v=>typeof v==='string'&&v.includes('非全期完整行情')));

const before=globalThis.fetch, env={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY};
process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='not-a-real-key';
try {
 globalThis.fetch=async()=>{throw Error('upstream down')};
 const failed=await readiness();assert.equal(failed.status,503);const error=await failed.json();assert.equal(error.ready,false);assert.ok(!JSON.stringify(error).includes('not-a-real-key'));
 globalThis.fetch=async()=>Response.json([{report_id:'not-disclosed'}]);const healthy=await readiness();assert.equal(healthy.status,200);assert.equal((await healthy.json()).ready,true);
}finally{globalThis.fetch=before;for(const [key,value]of [['SUPABASE_URL',env.url],['SUPABASE_SERVICE_ROLE_KEY',env.key]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}

await assert.rejects(buildLandEvaluationPdfBuffer({report_text:'不完整報告'}),/欄位尚未齊全/);
const fixture=(await readFile(new URL('./submit-report.mjs',import.meta.url),'utf8')).match(/const completeReportText = `([\s\S]*?)`;/)[1];
await assert.rejects(buildLandEvaluationPdfBuffer({report_text:fixture.replace('建蔽率：60%','建蔽率：50%')}),/內容衝突/);
const bytes=await buildLandEvaluationPdfBuffer({report_text:fixture+'\n'+('合成測試長段落，驗證繁體中文自動換行與分頁。'.repeat(300)),client:'合成測試'});
assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok((await PDFDocument.load(bytes)).getPageCount()>1);
assert.ok(OWNER_RESEARCH_POLICY.startsWith('【區域市況、自然語言優劣勢與開發決策｜1.15.0'));
for(const rule of ['嫌惡設施','棟距採光','有效住宅樣本少於3筆','不使用Hermes或付費API'])assert.ok(OWNER_RESEARCH_POLICY.includes(rule));
console.log('Recovery checks passed: real case-card boundaries, compound rooms, explicit sample periods, storage outage, PDF rejection and Chinese multipage export.');
