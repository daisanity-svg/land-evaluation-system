import assert from 'node:assert/strict';
import {assessReportQuality} from '../lib/reportQuality.mjs';
import {auditDeclaredFacts,auditRecommendedPrice} from '../lib/reportConsistency.mjs';

const base={
  '01':'建議價格：45萬／坪\n基地面積：546.55坪\n土地使用分區：第五種住宅區',
  '04':'北向｜臨樂善二路約25米\n西向｜臨華亞三路約25米',
  '08':'競案一｜比較案\n成交價格：60萬／坪\n市場行情總結：本案具角地條件，建議以55～58萬／坪作為二樓以上住宅成交判斷。',
  '09':'二樓以上住宅：\n建議成交價格：45萬／坪\n店面：\n建議成交價格：50萬／坪',
};
assert.equal(auditRecommendedPrice(base).length,1);
const report_text=Object.entries(base).map(([id,v])=>id+'｜測試章節\n'+v).join('\n');
assert.equal(assessReportQuality({report_text}).status,'conflict');
for(const prose of [
  '比較案建議成交價格55～58萬／坪，本案仍以45萬／坪初估。',
  '本案住宅建議開價55～58萬／坪，成交價另議。',
  '本案住宅若採高樓層情境，建議55～58萬／坪。',
  '本案住宅建議價格待確認，競案成交55～58萬／坪。',
  '本案住宅原建議55～58萬／坪，目前調整為45萬／坪。',
  '比較案住宅成交均價55～58萬／坪。',
])assert.deepEqual(auditRecommendedPrice({...base,'08':'市場行情總結：'+prose}),[],prose);
assert.deepEqual(auditRecommendedPrice({...base,'01':'建議價格：56萬／坪','09':'二樓以上住宅：\n建議成交價格：56萬／坪'}),[]);
assert.equal(auditRecommendedPrice({...base,'08':'市場行情總結：本案住宅預判５５－５８萬元／坪。'}).length,1);
assert.equal(auditRecommendedPrice({...base,'08':'市場行情總結：比較案成交60萬／坪。','12':'本案住宅建議售價55～58萬／坪。'}).length,1);

assert.ok(auditDeclaredFacts({...base,'02':'基地面積：1810坪'}).some(x=>x.includes('基地面積')));
assert.deepEqual(auditDeclaredFacts({...base,'02':'基地面積：1,806.78㎡'}),[]);
assert.ok(auditDeclaredFacts({...base,'01':base['01']+'\n里別：樂善里','06':'里別：文化里'}).some(x=>x.includes('里別')));
assert.ok(auditDeclaredFacts({...base,'01':base['01']+'\n基礎教育學區：甲國小','06':'基礎教育學區：乙國小'}).some(x=>x.includes('學區')));
assert.deepEqual(auditDeclaredFacts({...base,'06':'基礎教育學區：待確認'}),[]);
assert.ok(auditDeclaredFacts({...base,'12':'北向｜臨善捷二路約25米'}).some(x=>x.includes('北向')));
assert.deepEqual(auditDeclaredFacts({...base,'12':'北向｜臨樂善二路，銜接華亞二路'}),[]);
assert.deepEqual(auditDeclaredFacts({...base,'05':'交通通勤：可銜接華亞二路及文化一路。'}),[]);
console.log('Cross-chapter recommendation, declared base facts and scoped road comparisons passed; competitor, asking-price, scenario and pending values are excluded.');
