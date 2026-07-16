import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runProductionSmokeChecks } from '../scripts/production-smoke-check.mjs';

const reportId = 'hy-1783998431127-iairjp';

function validOpenApi() {
  return {
    openapi: '3.1.0',
    paths: {
      '/api/reports': {
        post: {
          operationId: 'submitReport',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  required: ['report_id', 'client', 'land_number', 'research_date', 'summary', 'report_text'],
                },
              },
            },
          },
          responses: {
            200: {}, 201: {}, 400: {}, 401: {}, 403: {}, 500: {}, 502: {},
          },
        },
      },
    },
    components: {
      schemas: {
        SubmitSuccess: {
          required: ['success', 'saved', 'verified', 'operation', 'report_id', 'request_id', 'message'],
        },
      },
    },
  };
}

function validResponses(overrides = {}) {
  return {
    '/': new Response('<!doctype html><html><body>Land evaluation</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }),
    '/api/health': Response.json({ ok: true, status: 'healthy', service: 'land-evaluation-system' }),
    '/api/health-supabase': Response.json({
      ok: true,
      supabase: { configured: true, ok: true, status: 200 },
    }),
    '/api/openapi': Response.json(validOpenApi()),
    [`/api/reports/${reportId}/status`]: Response.json({
      exists: true,
      report_id: reportId,
      client: '監控案件',
      land_number: '測試地號',
      research_date: '2026-07-15',
      has_report_text: true,
      report_text_length: 3566,
      has_summary: true,
      created_at: '2026-07-15T00:00:00.000Z',
      updated_at: '2026-07-15T00:00:00.000Z',
    }),
    ...overrides,
  };
}

function createFetch(responses, calls = []) {
  return async (url, init) => {
    const parsed = new URL(url);
    calls.push({ path: parsed.pathname, method: init?.method, headers: init?.headers });
    const response = responses[parsed.pathname];
    if (!response) throw new Error('Unexpected endpoint');
    return response.clone();
  };
}

async function runWith(overrides = {}, extraOptions = {}) {
  const calls = [];
  const result = await runProductionSmokeChecks({
    baseUrl: 'https://example.test',
    reportId,
    fetchImpl: createFetch(validResponses(overrides), calls),
    attempts: 2,
    retryDelayMs: 0,
    ...extraOptions,
  });
  return { result, calls };
}

{
  const { result, calls } = await runWith();
  assert.equal(result.ok, true);
  assert.equal(result.checked.length, 5);
  assert.equal(calls.length, 5);
  assert.ok(calls.every((call) => call.method === 'GET'));
  assert.ok(calls.every((call) => !Object.keys(call.headers || {}).some((header) => header.toLowerCase() === 'authorization')));
}

await assert.rejects(
  () => runWith({
    '/api/health-supabase': Response.json({ ok: false, supabase: { configured: true, ok: false, status: 503 } }),
  }),
  /Supabase health: ok must be true/,
);

{
  const spec = validOpenApi();
  delete spec.paths['/api/reports'].post.responses['502'];
  await assert.rejects(
    () => runWith({ '/api/openapi': Response.json(spec) }),
    /response codes are incomplete/,
  );
}

await assert.rejects(
  () => runWith({
    [`/api/reports/${reportId}/status`]: Response.json({
      exists: true,
      report_id: reportId,
      has_report_text: true,
      report_text_length: 10,
      has_summary: false,
    }),
  }),
  /summary is unavailable/,
);

await assert.rejects(
  () => runWith({
    [`/api/reports/${reportId}/status`]: Response.json({
      exists: true,
      report_id: reportId,
      has_report_text: true,
      report_text_length: 10,
      has_summary: true,
      report_text: 'This must remain private.',
    }),
  }),
  /full report text must not be public/,
);

{
  const responses = validResponses();
  let attempts = 0;
  const result = await runProductionSmokeChecks({
    baseUrl: 'https://example.test',
    reportId,
    attempts: 2,
    retryDelayMs: 0,
    fetchImpl: async (url) => {
      attempts += 1;
      if (attempts === 1) throw new Error('Temporary network failure');
      return responses[new URL(url).pathname].clone();
    },
  });
  assert.equal(result.ok, true);
  assert.equal(attempts, 6);
}

{
  const fakeSecret = 'eyJhbGciOiJIUzI1NiJ9.abcdefghijklmnop.qrstuvwxyz123456';
  await assert.rejects(
    () => runWith({ '/api/health': new Response(fakeSecret, { status: 200 }) }),
    (error) => {
      assert.match(error.message, /appears to contain a credential/);
      assert.doesNotMatch(error.message, new RegExp(fakeSecret));
      return true;
    },
  );
}

{
  const script = await readFile('scripts/production-smoke-check.mjs', 'utf8');
  const workflow = await readFile('.github/workflows/production-monitor.yml', 'utf8');
  assert.doesNotMatch(script, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
  assert.doesNotMatch(script, /Authorization\s*:/i);
  assert.doesNotMatch(script, /SUPABASE_SERVICE_ROLE_KEY|\bapikey\s*:/i);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /issues:\s*write/);
  assert.match(workflow, /node scripts\/production-smoke-check\.mjs/);
  assert.doesNotMatch(workflow, /\/api\/reports(?:['"\s]|$).*\b(?:POST|PUT|PATCH|DELETE)\b/i);
}

console.log('Read-only production monitor checks passed.');
