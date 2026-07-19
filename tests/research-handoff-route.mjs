import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POST } from '../app/api/research/handoff/route.js';

const fixture = JSON.parse(readFileSync('fixtures/research/shanjie-188-189.phase2a.json', 'utf8'));

const blockedResponse = await POST(new Request('http://localhost/api/research/handoff', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(fixture),
}));
const blockedBody = await blockedResponse.json();

assert.equal(blockedResponse.status, 422);
assert.equal(blockedBody.accepted, false);
assert.equal(blockedBody.handoff, null);
assert.ok(blockedBody.blockers.length > 0);
assert.equal(blockedBody.audit.submitReport_called, false);

const acceptedFixture = structuredClone(fixture);
acceptedFixture.quality_gate.allow_formal_report = true;
const acceptedResponse = await POST(new Request('http://localhost/api/research/handoff', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(acceptedFixture),
}));

assert.equal(acceptedResponse.status, 422, 'a false-positive quality flag must not bypass the server gate');
assert.equal((await acceptedResponse.json()).accepted, false);

console.log('Research handoff route checks passed.');
