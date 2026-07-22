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

const formalFixture = structuredClone(fixture);
for (const [key, value] of Object.entries({
  parcel_area_each: { 188: 602.99, 189: 1203.79 },
  parcel_area_total_sqm: 1806.78,
  parcel_area_total_ping: 546.55,
  zoning: '第五種住宅區',
  building_coverage_ratio: 60,
  floor_area_ratio: 300,
  legal_source: '地號套繪之官方都市計畫分區證明',
})) {
  const field = formalFixture.fields[key];
  field.raw_value = value;
  field.normalized_value = value;
  field.status = 'official_confirmed';
  field.source_type = 'government';
  field.source_name = '去識別化官方佐證 fixture';
  field.source_url = `https://example.gov.tw/${key}`;
  field.source_date = '2026-07-19';
  field.evidence = `${key} 已由去識別化官方佐證 fixture 確認。`;
  field.confidence = 100;
  field.conflicts = [];
  field.manual_review_reason = '';
}
formalFixture.quality_gate.allow_definite_volume = true;
formalFixture.quality_gate.allow_definite_legal_conclusion = true;
formalFixture.quality_gate.allow_formal_report = true;
formalFixture.quality_gate.blocking_reasons = [];
formalFixture.quality_gate.manual_review_items = [];

const formalResponse = await POST(new Request('http://localhost/api/research/handoff', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formalFixture),
}));
const formalBody = await formalResponse.json();

assert.equal(formalResponse.status, 200);
assert.equal(formalBody.accepted, true);
assert.equal(formalBody.package_id, formalFixture.package_id);
assert.match(formalBody.handoff_sha256, /^[a-f0-9]{64}$/);
assert.match(formalBody.handoff, /已通過正式報告資格/);
assert.equal(formalBody.audit.submitReport_called, false);

console.log('Research handoff route checks passed.');
