import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POST } from '../app/api/research/validate/route.js';

const fixture = JSON.parse(readFileSync('fixtures/research/shanjie-188-189.phase2a.json', 'utf8'));

const validResponse = await POST(new Request('http://localhost/api/research/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(fixture),
}));
const validBody = await validResponse.json();

assert.equal(validResponse.status, 200);
assert.equal(validBody.accepted, true);
assert.equal(validBody.result.valid, true);
assert.deepEqual(validBody.audit, {
  submitReport_called: false,
  supabase_written: false,
  production_modified: false,
});

const rejectedFixture = structuredClone(fixture);
rejectedFixture.audit.submitReport_called = true;

const rejectedResponse = await POST(new Request('http://localhost/api/research/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(rejectedFixture),
}));
const rejectedBody = await rejectedResponse.json();

assert.equal(rejectedResponse.status, 422);
assert.equal(rejectedBody.accepted, false);
assert.equal(rejectedBody.result.valid, false);
assert.match(rejectedBody.result.errors.join('\n'), /submitReport_called/);

const invalidResponse = await POST(new Request('http://localhost/api/research/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{not json}',
}));

assert.equal(invalidResponse.status, 400);
assert.equal((await invalidResponse.json()).accepted, false);

console.log('Research validation route checks passed.');
