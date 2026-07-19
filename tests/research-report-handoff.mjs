import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildResearchReportHandoff } from '../lib/researchReportHandoff.mjs';

const fixture = JSON.parse(readFileSync('fixtures/research/shanjie-188-189.phase2a.json', 'utf8'));
const blocked = buildResearchReportHandoff(fixture);

assert.equal(blocked.eligible, false);
assert.equal(blocked.text, '');
assert.ok(blocked.blockers.length > 0);

const acceptedFixture = structuredClone(fixture);
acceptedFixture.quality_gate.allow_formal_report = true;
const accepted = buildResearchReportHandoff(acceptedFixture);

assert.equal(accepted.eligible, true);
assert.match(accepted.text, /已通過正式報告資格/);
assert.match(accepted.text, /不得補猜/);
assert.match(accepted.text, /parcel_area_total_sqm/);
assert.doesNotMatch(accepted.text, /submitReport_called/);

console.log('Research report handoff checks passed.');
