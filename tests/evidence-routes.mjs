import assert from 'node:assert/strict';
import {POST as mcp} from '../app/api/mcp/route.js';
import {POST as verify} from '../app/api/research/verify/route.js';
import {POST as save} from '../app/api/reports/route.js';
import {readFileSync} from 'node:fs';
const request=body=>new Request('https://example.test/api/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('read-only validation must not write or fetch');};
try{
 const listed=await (await mcp(request({jsonrpc:'2.0',id:1,method:'tools/list'}))).json();assert.deepEqual(listed.result.tools.map(x=>x.name),['submitReport','verifyResearch','lookupLandParcels']);
 const check=await (await mcp(request({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'verifyResearch',arguments:{research_evidence:{version:1,land_number:'測試段1地號',research_date:'2026-10-06',claims:[]}}}}))).json();assert.equal(check.result.structuredContent.review_record_complete,false);assert.equal(check.result.structuredContent.source_verification_complete,false);assert.equal(calls,0);
 const invalid=await verify(request({research_evidence:{version:1,land_number:'測試段1地號',research_date:'2026-02-30',claims:[]}}));assert.equal(invalid.status,422);assert.equal((await invalid.json()).database_written,false);
 const page=readFileSync('app/page.jsx','utf8'),layout=readFileSync('app/layout.jsx','utf8');assert.equal((page.match(/onClick=\{printPdf\}/g)||[]).length,1);assert.equal((page.match(/onClick=\{downloadExcel\}/g)||[]).length,1);assert.doesNotMatch(layout,/excel-download\.js|hiyes-price-adjust\.js|hiyes-site-adjust\.js/);assert.match(page,/手動貼回或修改報告/);assert.match(page,/summary:null/);
}finally{globalThis.fetch=original;}
console.log('Read-only tools do not write; evidence failures and single export entry regression passed.');
