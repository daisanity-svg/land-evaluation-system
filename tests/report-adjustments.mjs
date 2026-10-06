import assert from 'node:assert/strict';
import {applyReportAdjustments} from '../lib/reportAdjustments.mjs';
const text=`01｜案件摘要
建議價格：60萬／坪
臨路條件：東側道路
04｜臨路條件與基地四向現況
臨路條件：東側道路
東向｜東路｜通勤
南向：鄰地
09｜價格預判
二樓以上住宅：
建議成交價格：60萬／坪
店面：
建議成交價格：80萬／坪
坡道平面車位：
建議成交價格：200萬／位
10｜產品規劃建議
兩房產品：
建議坪數：23～26坪
三房產品：
建議坪數：32～36坪
12｜結論
建議價格：60萬／坪`;
const changed=applyReportAdjustments(text,{residential:'62',parking:'210萬／位',twoRoomMin:'24',twoRoomMax:'27',road:'南側計畫道路，尚未開闢',南向:'計畫道路｜尚未開闢'});
assert.equal((changed.match(/62萬／坪/g)||[]).length,3);assert.equal((changed.match(/南側計畫道路，尚未開闢/g)||[]).length,2);assert.match(changed,/建議坪數：24～27坪/);assert.match(changed,/南向｜計畫道路｜尚未開闢/);assert.match(changed,/店面：\n建議成交價格：80萬／坪/);assert.match(changed,/210萬／位/);
for(const values of [{residential:'abc'},{parking:'60萬／坪'},{twoRoomMin:'28',twoRoomMax:'22'},{twoRoomMin:'28'}])assert.throws(()=>applyReportAdjustments(text,values));
console.log('Canonical report adjustments preserve all chapters and update summary/conclusion/export values together.');
