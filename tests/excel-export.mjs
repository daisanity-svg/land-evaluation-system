import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildLandEvaluationExcelBuffer } from '../lib/landEvaluationExcel.js';

function competitor(index, name, builder, parking, count, age = '預售，2025年11月開案') {
  return `競案${index}｜${name}
競案等級：直接競案
案子規劃：${builder}，預售案，規劃2～3房、29～42坪
屋齡：${age}
成交期間：近一年
成交筆數：${count}筆
成交價格：住宅約60萬／坪；坡道平面車位約${parking}萬元
參考價值：有效比較案例。`;
}

const reportText = `01｜案件摘要
配合業主：佳峻建設
調研日期：2026-05-29
目標地號：新北市泰山區貴仁段318、337、338地號
基地位置：新北市泰山區貴仁段、新泰塭仔圳重劃區
土地使用分區：第三種住宅區
基地面積：934坪
建蔽率：50%
容積率：210%
臨路條件：三面臨路
建議產品：兩房26～30坪、三房36～42坪

08｜競案分級與市場行情
${competitor('一', '百達莊園', '偉築建設', 210, 167)}

${competitor('二', '義泰信', '義泰建設', 245, 89)}

${competitor('三', '閱讀台灣', '丞石建築', 250, 16, '2022年7月開案，即將交屋')}

${competitor('四', '明志書苑', '茂德建設', 280, 9, '2022年11月開案，新成屋')}

${competitor('五', '武泰臻愛', '武泰建設', 220, 2)}
市場行情總結：住宅成交約55～67萬／坪。

09｜價格預判
二樓以上住宅：
建議成交價格：58萬／坪
店面：
建議成交價格：68萬／坪
坡道平面車位：
建議成交價格：210萬／位

11｜銷售優勢與抗性
銷售優勢：
一、重劃區成長題材
二、交通生活圈可塑性
三、基地三面臨路
銷售抗性：
一、新案供給集中
二、生活機能仍在成熟
三、計畫道路進度待確認`;

async function load(report) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await buildLandEvaluationExcelBuffer(report));
  return workbook.getWorksheet('工作表1');
}

const sheet = await load({
  client: '佳峻建設',
  research_date: '2026-05-29',
  land_number: '新北市泰山區貴仁段318、337、338地號',
  report_text: reportText,
});

assert.ok(sheet.getCell('F2').value instanceof Date, 'research date must be stored as an Excel date');
assert.equal(sheet.getCell('F2').numFmt, 'yyyy-mm-dd');
assert.deepEqual(['B19', 'B20', 'B21', 'B22'].map((cell) => sheet.getCell(cell).value), ['偉築建設', '義泰建設', '丞石建築', '茂德建設']);
assert.deepEqual(['C19', 'C20', 'C21', 'C22'].map((cell) => sheet.getCell(cell).value), ['百達莊園', '義泰信', '閱讀台灣', '明志書苑']);
assert.deepEqual(['D19', 'D20', 'D21', 'D22'].map((cell) => sheet.getCell(cell).value), ['預售', '預售', '即將交屋', '新成屋']);
assert.deepEqual(['H19', 'H20', 'H21', 'H22'].map((cell) => sheet.getCell(cell).value), ['210萬/位', '245萬/位', '250萬/位', '280萬/位']);
assert.deepEqual(['I19', 'I20', 'I21', 'I22'].map((cell) => sheet.getCell(cell).value), ['實價登錄', '實價登錄', '實價登錄', '實價登錄']);
assert.equal(sheet.getCell('J19').value, '114.11開案；近一年成交167筆');
assert.equal(sheet.getCell('B26').value, '1. 重劃區成長題材');
assert.equal(sheet.getCell('B30').value, '1. 新案供給集中');
assert.equal(sheet.getCell('D23').value, '58 萬/坪');
assert.equal(sheet.getCell('H23').value, '68 萬/坪');
assert.equal(sheet.getCell('H24').value, '210 萬/位');

const threeCaseText = reportText.replace(/\n競案四｜[\s\S]*?(?=市場行情總結：)/, '\n');
const threeCaseSheet = await load({ research_date: '2026-05-29', report_text: threeCaseText });
assert.equal(threeCaseSheet.getCell('C21').value, '閱讀台灣');
assert.equal(threeCaseSheet.getCell('C22').value, null, 'three valid competitors must not be padded to four');

console.log('Excel export mapping tests passed.');
