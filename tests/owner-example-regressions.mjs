import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {buildLandEvaluationExcelBuffer} from '../lib/landEvaluationExcel.js';
const report = (price, parking='220萬元／位') => `01｜案件摘要
基地位置：測試生活圈
08｜競案分級與市場行情
競案一｜測試案
建設公司：測試建設
案子規劃：2～4房、27～47坪
屋齡：預售
成交期間：2026-04-01至2026-10-07
成交筆數：20筆
成交價格：${price}
車位價格：${parking}
資訊來源：測試來源
09｜價格預判
二樓以上住宅：
建議成交價格：2026年10月本案建議60萬元／坪（初估）
店面：
建議成交價格：68萬元／坪（初估）
坡道平面車位：
建議成交價格：200万元／位（初估）`;
async function cell(text,address){const w=new ExcelJS.Workbook();await w.xlsx.load(await buildLandEvaluationExcelBuffer({report_text:text}));return w.getWorksheet('工作表1').getCell(address).value;}
for(const [input,expected] of [
 ['2026年4月至10月共20筆，住宅均價59.5萬元／坪','59.5萬/坪'],
 ['2026年成交128筆，住宅平均單價60萬／坪；車位220萬元／位','60萬/坪'],
 ['2026年7月，均價63.6萬元／坪','63.6萬/坪'],
 ['近半年20筆，每坪67.4萬元','67.4萬/坪'],
 ['60萬','60萬/坪'],
 ['2026年成交20筆','待複核'],
 ['車位220萬元／位；住宅均價60萬元／坪','60萬/坪'],
]) assert.equal(await cell(report(input),'G19'),expected,input);
const x=report('60萬／坪');
assert.equal(await cell(x,'D23'),'60 萬/坪（初估）');
assert.equal(await cell(x,'H23'),'68 萬/坪（初估）');
assert.equal(await cell(x.replace('200万元','200萬元'),'H24'),'200 萬/位（初估）');
assert.equal(await cell(x,'E19'),'2-4房');
assert.equal(await cell(x,'F19'),'27-47坪');
console.log('Owner example regressions passed: dates/counts never become prices; initial estimates, room types and full project sizes survive export.');
