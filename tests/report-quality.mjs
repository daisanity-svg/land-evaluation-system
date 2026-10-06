import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessReportQuality} from '../lib/reportQuality.mjs';
const report={report_text:`01｜案件摘要
土地使用分區：住宅區
基地面積：100坪
建蔽率：60%
容積率：200%
建議價格：55～58萬／坪
03｜法規與量體初判
建蔽率：60%
容積率：200%
04｜臨路條件與基地四向現況
臨路條件：甲路20公尺
06｜學區與里別
里別：甲里
基礎教育學區：甲國小
中等教育學區：甲國中
08｜競案分級與市場行情
競案一｜甲案
市場行情總結：55～58萬／坪
09｜價格預判
二樓以上住宅：
建議成交價格：55～58萬／坪
店面：
建議成交價格：待複核
12｜結論
建議價格：55～58萬／坪`};
assert.equal(assessReportQuality(report).status,'preliminary');
assert.ok(assessReportQuality(report).missing_core_fields.includes('核實紀錄與成交驗算'));
assert.equal(assessReportQuality(report).source_verification_complete,false);
assert.equal(assessReportQuality({...report,report_text:report.report_text.replace('建蔽率：60%','建蔽率：50%')}).status,'conflict');
assert.equal(assessReportQuality({...report,report_text:report.report_text.replace('建議成交價格：55～58','建議成交價格：45')}).status,'conflict');
assert.equal(assessReportQuality({...report,report_text:report.report_text.replace('甲國小','待複核')}).status,'preliminary');
console.log('Report completeness, inconsistent values and source verification distinction passed.');

assert.ok(!assessReportQuality({...report,report_text:report.report_text.replace('甲路20公尺','計畫道路20公尺，尚未開闢')}).missing_core_fields.includes('臨路條件'));


const incomplete=assessReportQuality(report);
assert.ok(incomplete.missing_core_fields.includes('銷售優勢須有三項具體依據'));
assert.ok(incomplete.missing_core_fields.includes('個案成交均價與筆數'));
assert.ok(incomplete.missing_core_fields.includes('區域銷況須引用個案參考'));
const content=report.report_text.replace('06｜學區與里別',`05｜生活圈與公共設施
交通動線：甲路銜接乙站，提供聯外與軌道通勤。
生活機能：丙市場與丁商圈提供日常採買。
公共建設：戊活動中心營運，己公園開放，庚運動中心提供運動設施。
06｜學區與里別`).replace('競案一｜甲案','競案一｜甲案\n成交筆數：3筆\n成交價格：住宅均價56萬／坪').replace('市場行情總結：55～58萬／坪','市場行情總結：甲案三筆成交均價56萬／坪').replace('12｜結論',`11｜銷售優勢與抗性
銷售優勢：
一、甲路串聯乙站通勤。
二、丙市場提供採買。
三、己公園提供休閒。
銷售抗性：
一、周邊同型競案供給增加。
二、區域尖峰道路交通量較大。
三、換屋總價門檻高於中古產品。
12｜結論`);
const completeContent=assessReportQuality({...report,report_text:content});
for(const field of ['銷售優勢須有三項具體依據','銷售抗性須有三項具體依據','個案成交均價與筆數','區域銷況須引用個案參考'])assert.ok(!completeContent.missing_core_fields.includes(field),field);
assert.ok(assessReportQuality({...report,report_text:content.replace('己公園提供休閒。','尚無已確認明顯項目。')}).missing_core_fields.includes('銷售優勢須有三項具體依據'));
console.log('Competitor-based sales narrative, real transaction fields and three substantive SWOT points required for completeness.');
