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
資訊來源：實價登錄
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

// The MCP workflow may return the same facts in a narrative, rather than the old
// fixed-field template. Those facts must still populate the existing workbook.
const narrativeReport = `01｜案件摘要
配合業主：弘峻建設
調研日期：2026-10-04
目標地號：桃園市大溪區田心子段下田心子小段 1994-0000、1994-0001
基地位置：桃園市大溪區田心子段
土地使用分區：住宅區
基地面積：約1,240坪

03｜法規條件
本案初判建蔽率60%、容積率200%。

04｜基地四向與道路
南側臨東和路，作為主要出入動線；其餘三側為既有住宅與農地。

05｜生活圈與公共設施
本案屬大溪市區成熟生活圈，周邊有市場、學校與公園，採買及日常生活便利。

08｜競案分級與市場行情
競案一｜宜誠天匯
案子規劃：宜誠建設，預售案，規劃2～3房、25～38坪
屋齡／進度：2026年完工
近一年成交：共38筆
成交價格：住宅約31～35萬／坪；坡道平面車位約160萬元
市場行情：大溪市區新案成交主流約31～35萬／坪。

10｜產品建議
2房：25～28坪，鎖定首購與在地就業客。
3房：35～38坪，鎖定換屋家庭。
`;
const narrativeSheet = await load({ research_date: '2026-10-04', report_text: narrativeReport });
assert.equal(narrativeSheet.getCell('B5').value, '60%');
assert.equal(narrativeSheet.getCell('F5').value, '200%');
assert.match(narrativeSheet.getCell('C11').value, /南側臨東和路/);
assert.match(narrativeSheet.getCell('B13').value, /東和路/);
assert.match(narrativeSheet.getCell('B14').value, /成熟生活圈/);
assert.match(narrativeSheet.getCell('B15').value, /市場/);
assert.match(narrativeSheet.getCell('B16').value, /31～35/);
assert.match(narrativeSheet.getCell('B17').value, /2房/);
assert.equal(narrativeSheet.getCell('D19').value, '2026年完工');
assert.equal(narrativeSheet.getCell('J19').value, '近一年成交38筆');

const fixedTemplateReport = narrativeReport.replace(
  `10｜產品建議\n2房：25～28坪，鎖定首購與在地就業客。\n3房：35～38坪，鎖定換屋家庭。`,
  `10｜產品規劃建議\n兩房產品：\n建議坪數：24～26坪\n對應客群：首購與小家庭\n總價控制：總價可負擔\n規劃理由：提高市場接受度\n\n三房產品：\n建議坪數：30～34坪\n對應客群：在地換屋家庭\n總價控制：避免總價過高\n規劃理由：承接家庭換屋需求\n\n不建議產品：四房大坪數產品。`,
);
const fixedTemplateSheet = await load({ research_date: '2026-10-04', report_text: fixedTemplateReport });
assert.match(fixedTemplateSheet.getCell('B17').value, /建議坪數：24～26坪/);
assert.match(fixedTemplateSheet.getCell('B17').value, /建議坪數：30～34坪/);

console.log('Excel export mapping tests passed.');

const unknownPriceReport=reportText.replace('建議成交價格：58萬／坪','建議成交價格：待複核；2026年資料不足3筆').replace('建議成交價格：68萬／坪','建議成交價格：待複核').replace('建議成交價格：210萬／位','建議成交價格：不適用');
const unknownSheet=await load({report_text:unknownPriceReport});
assert.equal(unknownSheet.getCell('D23').value,'待複核');
assert.equal(unknownSheet.getCell('H23').value,'待複核');
assert.equal(unknownSheet.getCell('H24').value,'不適用');
assert.equal(unknownSheet.pageSetup.orientation,'portrait');
assert.equal(unknownSheet.getColumn(1).width,14.3984375);
assert.ok(unknownSheet.model.merges.includes('A34:J46'));
const noSource=await load({report_text:reportText.replaceAll('資訊來源：實價登錄\n','')});
assert.equal(noSource.getCell('I19').value,'待複核','numbers must never imply a verified original source');
const detailed=await load({report_text:reportText.replace('案子規劃：偉築建設','房型：2-3房\n坪數：29-42坪\n全案有效成交筆數：167筆\n近半年有效成交筆數：30筆（2026年4月至9月）\n銷售率：待複核；可售戶數未確認\n月均成交量：5筆\n案子規劃：偉築建設')});
assert.match(detailed.getCell('I19').value,/近半年有效成交筆數：30筆/);
assert.match(detailed.getCell('I19').value,/銷售率：待複核/);
console.log('Reference layout, missing-price preservation and explicit source checks passed.');
