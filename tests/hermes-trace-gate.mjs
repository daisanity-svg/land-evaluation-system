import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { evaluateHermesTrace } from '../lib/hermesTraceGate.mjs';

const fixture = JSON.parse(readFileSync('fixtures/hermes/phase2b-trace-envelope.valid.json', 'utf8'));
const failedProbe = JSON.parse(readFileSync('fixtures/hermes/phase2b-probe-observation.failed.json', 'utf8'));
const schema = JSON.parse(readFileSync('schemas/hermes-trace-envelope.schema.json', 'utf8'));
const clone = () => structuredClone(fixture);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
assert.equal(validateSchema(fixture), true, ajv.errorsText(validateSchema.errors, { separator: '\n' }));

function expectInvalid(mutator, expectedMessage) {
  const candidate = clone();
  mutator(candidate);
  const result = evaluateHermesTrace(candidate);
  assert.equal(result.valid, false, `expected invalid trace for: ${expectedMessage}`);
  assert.ok(result.errors.some((error) => error.includes(expectedMessage)), result.errors.join('\n'));
}

const result = evaluateHermesTrace(fixture);
assert.equal(result.valid, true, result.errors.join('\n'));
assert.equal(result.trace.run_id, result.trace.session_id);
assert.equal(result.trace.artifact_count, 1);

assert.equal(validateSchema(failedProbe), false, 'the real probe must fail schema validation while artifacts are empty');
const failedProbeResult = evaluateHermesTrace(failedProbe);
assert.equal(failedProbeResult.valid, false, 'the real probe must remain blocked');
assert.ok(failedProbeResult.errors.some((error) => error.includes('exactly one retrievable artifact')));

expectInvalid((candidate) => {
  candidate.run.session_id = 'run_priorphase2a';
}, 'must equal run_id');

expectInvalid((candidate) => {
  candidate.run.output = '(empty)';
}, 'must contain the probe JSON');

expectInvalid((candidate) => {
  candidate.run.output = 'unrelated prior project artifact';
}, 'must be one compact JSON object');

expectInvalid((candidate) => {
  const output = JSON.parse(candidate.run.output);
  output.case_id = 'foreign-case';
  candidate.run.output = JSON.stringify(output);
}, 'does not match the requested case');

expectInvalid((candidate) => {
  candidate.artifacts = [];
}, 'must contain exactly one retrievable artifact');

expectInvalid((candidate) => {
  candidate.artifacts.push(structuredClone(candidate.artifacts[0]));
}, 'must contain exactly one retrievable artifact');

expectInvalid((candidate) => {
  candidate.artifacts[0].run_id = 'run_foreign';
}, 'does not match the run');

expectInvalid((candidate) => {
  candidate.artifacts[0].filename = 'prior_project.md';
}, 'does not match the requested artifact');

expectInvalid((candidate) => {
  candidate.artifacts[0].sha256 = '0'.repeat(64);
}, 'does not match the verified content');

expectInvalid((candidate) => {
  candidate.audit.production_modified = true;
}, 'audit.production_modified: must remain false');

expectInvalid((candidate) => {
  candidate.run.output = `${candidate.run.output} Bearer phase2b-trace-token-123456789`;
}, 'credential-like material detected');

console.log('Hermes trace gate checks passed.');
