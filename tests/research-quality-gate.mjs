import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { evaluateResearchQuality } from '../lib/researchQualityGate.mjs';

const fixture = JSON.parse(readFileSync('fixtures/research/shanjie-188-189.phase2a.json', 'utf8'));
const schema = JSON.parse(readFileSync('schemas/hermes-research-package.schema.json', 'utf8'));
const clone = () => structuredClone(fixture);

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictRequired: false,
  strictTypes: false,
});
addFormats(ajv);
const validateSchema = ajv.compile(schema);
assert.equal(validateSchema(fixture), true, ajv.errorsText(validateSchema.errors, { separator: '\n' }));

function expectInvalid(mutator, expectedMessage) {
  const candidate = clone();
  mutator(candidate);
  const result = evaluateResearchQuality(candidate);
  assert.equal(result.valid, false, `expected invalid package for: ${expectedMessage}`);
  assert.ok(result.errors.some((error) => error.includes(expectedMessage)), result.errors.join('\n'));
}

assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.deepEqual(schema.properties.audit.properties.research_date_difference_is_defect, { const: false });
assert.equal(schema.properties.competitors.minItems, 3);
assert.equal(schema.properties.competitors.maxItems, 5);

const result = evaluateResearchQuality(fixture);
assert.equal(result.valid, true, result.errors.join('\n'));
assert.equal(result.decisions.allow_formal_report, false);
assert.equal(result.decisions.allow_definite_volume, false);
assert.equal(result.decisions.allow_definite_legal_conclusion, false);
assert.equal(result.decisions.allow_definite_price, false);

expectInvalid((candidate) => {
  delete candidate.fields.parcel_count.status;
}, 'invalid or missing status');

expectInvalid((candidate) => {
  candidate.fields.excel_shared_string_index.source_url = '';
}, 'official_confirmed requires source_url');

expectInvalid((candidate) => {
  candidate.fields.zoning.normalized_value = '第五種住宅區';
}, 'conflict must not be auto-resolved');

expectInvalid((candidate) => {
  candidate.fields.parcel_area_total_sqm.normalized_value = 1806.78;
}, 'needs_manual_review must not be auto-filled');

expectInvalid((candidate) => {
  candidate.quality_gate.allow_definite_volume = true;
}, 'must be false until parcel area');

expectInvalid((candidate) => {
  candidate.quality_gate.allow_definite_legal_conclusion = true;
}, 'must be false while critical legal fields');

expectInvalid((candidate) => {
  candidate.boundaries.north.current_road_width = candidate.boundaries.north.planned_road_width;
}, 'planned and current road widths must be separate');

expectInvalid((candidate) => {
  delete candidate.boundaries.east;
}, 'boundaries.east: is required');

for (const count of [3, 4, 5]) {
  const candidate = clone();
  while (candidate.competitors.length < count) candidate.competitors.push(structuredClone(candidate.competitors[0]));
  candidate.competitors = candidate.competitors.slice(0, count);
  assert.equal(evaluateResearchQuality(candidate).valid, true, `${count} competitors should pass`);
}

for (const count of [2, 6]) {
  const candidate = clone();
  while (candidate.competitors.length < count) candidate.competitors.push(structuredClone(candidate.competitors[0]));
  candidate.competitors = candidate.competitors.slice(0, count);
  assert.equal(evaluateResearchQuality(candidate).valid, false, `${count} competitors should fail`);
}

const declaredMissing = clone();
declaredMissing.competitors[0].developer = null;
declaredMissing.competitors[0].parking_price = null;
declaredMissing.competitors[0].missing_fields.push('developer', 'parking_price');
assert.equal(evaluateResearchQuality(declaredMissing).valid, true, 'declared missing competitor data should pass');

expectInvalid((candidate) => {
  candidate.competitors[0].developer = null;
}, 'developer is missing and must be declared instead of fabricated');

expectInvalid((candidate) => {
  candidate.pricing.proposed_residential_price = '50萬/坪';
}, 'must be null while pricing is unresolved');

expectInvalid((candidate) => {
  candidate.audit.research_date_difference_is_defect = true;
}, 'audit.research_date_difference_is_defect: must remain false');

expectInvalid((candidate) => {
  candidate.audit.submitReport_called = true;
}, 'audit.submitReport_called: must remain false');

expectInvalid((candidate) => {
  candidate.fields.parcel_geometry.evidence = 'Bearer phase2a-test-token-123456789';
}, 'credential-like material detected');

console.log('Research quality gate checks passed.');
