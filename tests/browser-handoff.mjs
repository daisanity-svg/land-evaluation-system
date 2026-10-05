import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const page = readFileSync('app/page.jsx', 'utf8');
const functions = ['copyPrompt', 'openGpt', 'checkReturnedReport'].map(name => page.split('\n').find(line => line.trim().startsWith(`async function ${name}(`))).join('\n');
function context({ popup = true, clipboard = true, blocked = false } = {}) {
  const events = [];
  const ctx = vm.createContext({
    events, canOpen: true, form: { reportText: '' }, reportId: 'case-1', prompt: 'full', shortPrompt: 'short',
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
assert.match(ctx.message, /手動複製/);
assert.equal(ctx.lastLink, 'https://chatgpt.com/');
ctx = context({ blocked: true });
await ctx.openGpt();
assert.equal(ctx.events.length, 0);
assert.equal(ctx.message, 'case mismatch');
ctx = context();
let release, calls = 0;
ctx.fetch = () => { calls++; return new Promise(resolve => { release = resolve; }); };
const first = ctx.checkReturnedReport(true);
await ctx.checkReturnedReport(true);
assert.equal(calls, 1, 'overlapping status calls are coalesced');
release({ status: 404, json: async () => ({}) });
await first;
assert.equal(ctx.queryInFlight.current, false);
console.log('Popup, clipboard fallback, case identity and polling overlap tests passed.');
