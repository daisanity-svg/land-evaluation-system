import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateHermesModuleOutput } from '../lib/hermesModuleGate.mjs';

const evidence = {
  raw_value: 'value',
  normalized_value: 'value',
  unit: '',
  status: 'corroborated',
  source_type: 'government',
  source_name: 'Official fixture source',
  source_url: 'https://example.gov.test/source',
  source_date: '2026-07-18',
  retrieved_at: '2026-07-18T19:00:00+08:00',
  evidence: 'Fixture evidence.',
  confidence: 90,
  conflicts: [],
  manual_review_reason: '',
};

const legalOutput = JSON.stringify({
  case_id: 'case-legal-01',
  module: 'legal',
  fields: { zoning: evidence },
  blocking_reasons: [],
  audit: { submitReport_called: false, supabase_written: false, production_modified: false, main_modified: false },
});
assert.equal(evaluateHermesModuleOutput({ expectedCaseId: 'case-legal-01', expectedModule: 'legal', output: legalOutput }).valid, true);

const pythonNone = legalOutput.replace('"value"', 'None');
assert.equal(evaluateHermesModuleOutput({ expectedCaseId: 'case-legal-01', expectedModule: 'legal', output: pythonNone }).valid, false);

const wrongCase = JSON.parse(legalOutput);
wrongCase.case_id = 'foreign-case';
assert.ok(evaluateHermesModuleOutput({ expectedCaseId: 'case-legal-01', expectedModule: 'legal', output: JSON.stringify(wrongCase) }).errors.some((error) => error.includes('requested case')));

const falseOfficial = JSON.parse(legalOutput);
falseOfficial.fields.zoning.status = 'official_confirmed';
falseOfficial.fields.zoning.source_type = 'map_observation';
falseOfficial.fields.zoning.source_url = null;
const falseOfficialResult = evaluateHermesModuleOutput({ expectedCaseId: 'case-legal-01', expectedModule: 'legal', output: JSON.stringify(falseOfficial) });
assert.equal(falseOfficialResult.valid, false);
assert.ok(falseOfficialResult.errors.some((error) => error.includes('official_confirmed requires government')));

const boundaryOutput = JSON.stringify({
  case_id: 'case-boundary-01',
  module: 'boundary',
  boundaries: { north: { status: 'unavailable' }, south: { status: 'unavailable' }, east: { status: 'unavailable' }, west: { status: 'unavailable' } },
  blocking_reasons: [],
  audit: { submitReport_called: false, supabase_written: false, production_modified: false, main_modified: false },
});
assert.equal(evaluateHermesModuleOutput({ expectedCaseId: 'case-boundary-01', expectedModule: 'boundary', output: boundaryOutput }).valid, false);

const marketOutput = JSON.stringify({
  case_id: 'case-market-01',
  module: 'market',
  competitors: null,
  pricing: null,
  blocking_reasons: [],
  audit: { submitReport_called: false, supabase_written: false, production_modified: false, main_modified: false },
});
assert.ok(evaluateHermesModuleOutput({ expectedCaseId: 'case-market-01', expectedModule: 'market', output: marketOutput }).errors.some((error) => error.includes('3 to 5 competitors')));

const delta = JSON.parse(readFileSync('fixtures/research/shanjie-188-189.phase2b-delta.json', 'utf8'));
const each = delta.area_evidence.parcel_area_each.normalized_value;
assert.equal(Number((each['188'] + each['189']).toFixed(2)), delta.area_evidence.parcel_area_total_sqm.normalized_value);
assert.equal(delta.hermes_module_acceptance.filter((item) => item.accepted).length, 0);
assert.equal(delta.decisions.allow_formal_report, false);
assert.equal(delta.decisions.allow_submit_report, false);

console.log('Hermes module gate checks passed.');
