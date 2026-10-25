import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const page=fs.readFileSync('app/page.jsx','utf8');
const source=page.slice(page.indexOf('async function checkReturnedReport('),page.indexOf('\n useEffect(()=>{if(!loaded)return;const id='));
const urls=[];let calls=0;
const context={reportId:'new-empty-case',form:{},encodeURIComponent,Date,AbortSignal,
 setReportId:id=>{context.reportId=id},setWaiting:()=>{},setSyncMessage:()=>{},setViewMode:()=>{},setForm:fn=>{context.form=fn(context.form)},
 fetch:async url=>{urls.push(url);calls++;return calls===1?{status:503,ok:false,json:async()=>({error:'Temporary failure'})}:{status:200,ok:true,json:async()=>({report:{report_text:'01｜案件摘要',client:'測試',land_number:'麗林段239地號'}})}}};
const check=vm.runInNewContext('('+source+')',context);
await check(false,'existing-parcel-case');
assert.equal(context.reportId,'existing-parcel-case','a failed initial load must retain the requested case for retry');
await check();
assert.ok(urls.every(url=>url.startsWith('/api/reports/existing-parcel-case?')));
assert.equal(context.form.landNumber,'麗林段239地號');
console.log('Existing-case retry retains its identity after a failed initial load.');
