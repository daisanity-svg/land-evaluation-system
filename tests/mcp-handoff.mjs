import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const page = readFileSync('app/page.jsx', 'utf8');
const functions = ['copyPrompt', 'openGpt', 'checkReturnedReport'].map(name => page.split('\n').find(line => line.trim().startsWith(`async function ${name}(`))).join('\n');
function context({ popup = true, clipboard = true, blocked = false } = {}) {
  const events = [];
  const ctx = vm.createContext({busy:"",setBusy:()=>{},
    events, AbortSignal, buildPrompt: () => 'full', canOpen: true, form: { reportText: '' }, reportId: 'case-1', prompt: 'full', shortPrompt: 'short',
    LAND_PLUGIN_NAME: 'assistant', LAND_MCP_APP_NAME: 'mcp',
    approvedResearchState: () => ({ state: blocked ? 'blocked' : 'none', reason: 'case mismatch' }),
    queryInFlight: { current: false }, activeReportId: { current: 'case-1' },
    window: { open: () => { events.push('open'); return popup ? { opener: {}, location: {} } : null; } },
    navigator: { clipboard: { writeText: async () => { events.push('copy'); if (!clipboard) throw Error('denied'); } } },
    gptLink: () => 'https://chatgpt.com/', alert: () => {}, setTimeout: () => {},
    setCopied: () => {}, setLastLink: v => { ctx.lastLink = v; }, setWaiting: v => { ctx.waiting = v; },
    setSyncMessage: v => { ctx.message = v; }, setReportId: () => {}, setForm: () => {}, setViewMode: () => {},
    fetch: async () => ({ status: 404, json: async () => ({}) }),
  });
  vm.runInContext(functions, ctx);
  return ctx;
}
let ctx = context();
await ctx.openGpt();
assert.deepEqual(ctx.events, ['open', 'copy'], 'popup opens synchronously before clipboard await');
assert.equal(ctx.waiting, true);
ctx = context({ popup: false, clipboard: false });
await ctx.openGpt();
assert.match(ctx.message, /阻擋/);
assert.match(ctx.message, /若輸入框沒有帶入內容/);
assert.equal(ctx.lastLink, 'https://chatgpt.com/');
ctx = context({ blocked: true });
await ctx.openGpt();
assert.equal(ctx.events.length, 0);
assert.equal(ctx.message, 'case mismatch');
console.log('Popup timing, clipboard fallback and case guard passed.');
const workflow = (await import('../lib/researchWorkflow.mjs')).RESEARCH_WORKFLOW;
const lines=page.split('\n');
const promptCode=lines.filter(l=>/^const (LAND_MCP_APP_NAME|SECTIONS|today) =/.test(l)).join('\n')+'\n'+lines.find(l=>l.startsWith('function buildPrompt(form,'))+'\n'+lines.find(l=>l.startsWith('function buildShortPrompt(form,'));
const promptCtx=vm.createContext({busy:"",setBusy:()=>{},Intl,Date,RESEARCH_WORKFLOW:workflow});
vm.runInContext(promptCode,promptCtx);
const form={client:'測試業主',landNumber:'測試段1地號',researchDate:'2026-10-05'};
const full=promptCtx.buildPrompt(form,'test-report');
assert.match(full,/knowledge_included=true/);
assert.match(full,/version 1\.5\.0/);
assert.match(full,/工具缺失或讀取失敗即停止/);
assert.match(full,/success、saved、verified 均為 true/);
assert.match(full,/總送件次數不得超過三次/);
assert.doesNotMatch(full,/必須同時使用|若尚未載入此唯讀工具，使用/);
for(const value of ['測試業主','測試段1地號','2026-10-05','test-report'])assert.ok(full.includes(value));
const short=promptCtx.buildShortPrompt(form,'test-report');
assert.equal(short,full);
assert.match(short,/不需另選助手或自訂 GPT/);
assert.match(page,/gptLink\(completePrompt\)/);
assert.doesNotMatch(page,/gptLink\(shortPrompt\)/);
console.log('Merged MCP prompt, knowledge guard, case identity and success contract passed.');

const link=new URL('https://chatgpt.com/?prompt='+encodeURIComponent(full));
assert.equal(link.searchParams.get('prompt'),full);
assert.ok(link.href.length<12000,'standard case launch link stays compact');
console.log('Full prompt URL roundtrip: '+link.href.length+' characters.');
