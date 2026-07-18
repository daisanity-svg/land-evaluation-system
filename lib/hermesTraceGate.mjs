import { createHash } from 'node:crypto';

const FALSE_AUDIT_KEYS = [
  'submitReport_called',
  'supabase_written',
  'production_modified',
  'main_modified',
  'sensitive_data_present',
];

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function parseOutput(errors, output) {
  if (typeof output !== 'string' || !output.trim() || output.trim() === '(empty)') {
    addError(errors, 'run.output', 'must contain the probe JSON');
    return null;
  }
  try {
    const parsed = JSON.parse(output);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed;
  } catch {
    addError(errors, 'run.output', 'must be one compact JSON object');
    return null;
  }
}

function validateNoSecrets(errors, envelope) {
  const text = JSON.stringify(envelope);
  const patterns = [
    /Bearer\s+[A-Za-z0-9._~-]{12,}/i,
    /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_-]{16,}\b/,
    /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{16,}\b/,
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  ];
  if (patterns.some((pattern) => pattern.test(text))) {
    addError(errors, 'audit.sensitive_data_present', 'credential-like material detected');
  }
}

export function evaluateHermesTrace(envelope) {
  const errors = [];
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, errors: ['root: must be an object'] };
  }

  const probe = envelope.probe || {};
  const run = envelope.run || {};
  const artifacts = Array.isArray(envelope.artifacts) ? envelope.artifacts : [];
  const audit = envelope.audit || {};

  if (envelope.schema_version !== '1.0.0-phase2b') addError(errors, 'schema_version', 'unsupported schema version');
  if (probe.requested_fresh_session !== true) addError(errors, 'probe.requested_fresh_session', 'must be true');
  if (!String(probe.case_id || '').trim()) addError(errors, 'probe.case_id', 'is required');
  if (!String(probe.marker || '').trim()) addError(errors, 'probe.marker', 'is required');
  if (!String(probe.expected_artifact_filename || '').trim()) {
    addError(errors, 'probe.expected_artifact_filename', 'is required');
  }

  if (!String(run.run_id || '').trim()) addError(errors, 'run.run_id', 'is required');
  if (run.session_id !== run.run_id) {
    addError(errors, 'run.session_id', 'must equal run_id for an isolated fresh-session probe');
  }
  if (run.status !== 'completed') addError(errors, 'run.status', 'must be completed');
  if (run.last_event !== 'run.completed') addError(errors, 'run.last_event', 'must be run.completed');

  const output = parseOutput(errors, run.output);
  if (output) {
    if (output.case_id !== probe.case_id) addError(errors, 'run.output.case_id', 'does not match the requested case');
    if (output.marker !== probe.marker) addError(errors, 'run.output.marker', 'does not match the requested probe marker');
    if (output.artifact_filename !== probe.expected_artifact_filename) {
      addError(errors, 'run.output.artifact_filename', 'does not match the requested artifact');
    }
    for (const key of FALSE_AUDIT_KEYS.filter((key) => key !== 'sensitive_data_present')) {
      if (output[key] !== false) addError(errors, `run.output.${key}`, 'must be false');
    }
  }

  if (artifacts.length !== 1) {
    addError(errors, 'artifacts', 'must contain exactly one retrievable artifact');
  } else {
    const artifact = artifacts[0];
    if (artifact.run_id !== run.run_id) addError(errors, 'artifacts[0].run_id', 'does not match the run');
    if (artifact.filename !== probe.expected_artifact_filename) {
      addError(errors, 'artifacts[0].filename', 'does not match the requested artifact');
    }
    if (artifact.content_marker !== probe.marker) {
      addError(errors, 'artifacts[0].content_marker', 'does not match the requested probe marker');
    }
    const expectedHash = createHash('sha256').update(String(artifact.content_marker || '')).digest('hex');
    if (artifact.sha256 !== expectedHash) addError(errors, 'artifacts[0].sha256', 'does not match the verified content');
    if (output?.artifact_sha256 !== artifact.sha256) {
      addError(errors, 'run.output.artifact_sha256', 'does not match the retrieved artifact');
    }
  }

  for (const key of FALSE_AUDIT_KEYS) {
    if (audit[key] !== false) addError(errors, `audit.${key}`, 'must remain false');
  }
  validateNoSecrets(errors, envelope);

  return {
    valid: errors.length === 0,
    errors,
    trace: {
      case_id: probe.case_id || null,
      run_id: run.run_id || null,
      session_id: run.session_id || null,
      artifact_count: artifacts.length,
    },
  };
}
