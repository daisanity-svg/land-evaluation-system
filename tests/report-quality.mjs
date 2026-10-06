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
