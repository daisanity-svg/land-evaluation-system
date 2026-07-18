const STATUSES = new Set([
  'official_confirmed',
  'corroborated',
  'inferred',
  'conflict',
  'needs_manual_review',
  'unavailable',
]);

const SOURCE_TYPES = new Set([
  'government',
  'first_party',
  'market_platform',
  'map_observation',
  'user_provided',
  'derived',
]);

const EVIDENCE_KEYS = [
  'raw_value',
  'normalized_value',
  'unit',
  'status',
  'source_type',
  'source_name',
  'source_url',
  'source_date',
  'retrieved_at',
  'evidence',
  'confidence',
  'conflicts',
  'manual_review_reason',
];

const AUDIT_KEYS = ['submitReport_called', 'supabase_written', 'production_modified', 'main_modified'];

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectStatusObjects(value, path = 'root', result = []) {
  if (!isObject(value)) return result;
  if (Object.prototype.hasOwnProperty.call(value, 'status')) {
    result.push({ path, value });
    return result;
  }
  for (const [key, child] of Object.entries(value)) collectStatusObjects(child, `${path}.${key}`, result);
  return result;
}

function validateEvidence(errors, path, field) {
  for (const key of EVIDENCE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(field, key)) addError(errors, path, `missing ${key}`);
  }
  if (!STATUSES.has(field.status)) addError(errors, path, 'invalid status');
  if (!SOURCE_TYPES.has(field.source_type)) addError(errors, path, 'invalid source_type');
  if (!Number.isFinite(field.confidence) || field.confidence < 0 || field.confidence > 100) {
    addError(errors, path, 'confidence must be between 0 and 100');
  }
  if (!Array.isArray(field.conflicts)) addError(errors, path, 'conflicts must be an array');
  if (!String(field.evidence || '').trim()) addError(errors, path, 'evidence is required');

  if (field.status === 'official_confirmed') {
    if (!['government', 'first_party'].includes(field.source_type)) {
      addError(errors, path, 'official_confirmed requires government or first_party source');
    }
    if (!String(field.source_url || '').trim()) addError(errors, path, 'official_confirmed requires source_url');
    if (field.normalized_value === null || field.normalized_value === undefined) {
      addError(errors, path, 'official_confirmed requires normalized_value');
    }
  }
  if (field.status === 'conflict') {
    if (field.normalized_value !== null) addError(errors, path, 'conflict must not be auto-resolved');
    if (!Array.isArray(field.conflicts) || field.conflicts.length < 2) {
      addError(errors, path, 'conflict requires two source claims');
    }
  }
  if (['needs_manual_review', 'unavailable'].includes(field.status)) {
    if (field.normalized_value !== null) addError(errors, path, `${field.status} must keep normalized_value null`);
    if (!String(field.manual_review_reason || '').trim()) addError(errors, path, `${field.status} requires manual_review_reason`);
  }
}

function validateModuleShape(errors, moduleName, parsed) {
  if (moduleName === 'legal') {
    if (!isObject(parsed.fields)) addError(errors, 'fields', 'legal module requires fields object');
  } else if (moduleName === 'boundary') {
    if (!isObject(parsed.boundaries)) addError(errors, 'boundaries', 'boundary module requires boundaries object');
    for (const direction of ['north', 'south', 'east', 'west']) {
      if (!isObject(parsed.boundaries?.[direction])) addError(errors, `boundaries.${direction}`, 'is required');
    }
  } else if (moduleName === 'life') {
    if (!isObject(parsed.fields)) addError(errors, 'fields', 'life module requires fields object');
  } else if (moduleName === 'market') {
    if (!Array.isArray(parsed.competitors) || parsed.competitors.length < 3 || parsed.competitors.length > 5) {
      addError(errors, 'competitors', 'market module requires 3 to 5 competitors');
    }
    if (!isObject(parsed.pricing)) addError(errors, 'pricing', 'market module requires pricing object');
  } else {
    addError(errors, 'module', 'unsupported module');
  }
}

function validateNoSecrets(errors, value) {
  const text = JSON.stringify(value);
  const patterns = [
    /Bearer\s+[A-Za-z0-9._~-]{12,}/i,
    /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_-]{16,}\b/,
    /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{16,}\b/,
  ];
  if (patterns.some((pattern) => pattern.test(text))) addError(errors, 'audit', 'credential-like material detected');
}

export function evaluateHermesModuleOutput({ expectedCaseId, expectedModule, output }) {
  const errors = [];
  let parsed;
  if (typeof output !== 'string' || !output.trim()) {
    return { valid: false, errors: ['output: is empty'], parsed: null };
  }
  try {
    parsed = JSON.parse(output);
  } catch {
    return { valid: false, errors: ['output: must be strict JSON; Python None and prose are forbidden'], parsed: null };
  }
  if (!isObject(parsed)) return { valid: false, errors: ['output: must be one JSON object'], parsed: null };

  if (parsed.case_id !== expectedCaseId) addError(errors, 'case_id', 'does not match requested case');
  validateModuleShape(errors, expectedModule, parsed);

  const evidenceFields = collectStatusObjects(
    expectedModule === 'boundary' ? parsed.boundaries : parsed.fields,
    expectedModule === 'boundary' ? 'boundaries' : 'fields',
  );
  if (['legal', 'boundary', 'life'].includes(expectedModule) && evidenceFields.length === 0) {
    addError(errors, expectedModule === 'boundary' ? 'boundaries' : 'fields', 'contains no evidence fields');
  }
  evidenceFields.forEach(({ path, value }) => validateEvidence(errors, path, value));

  for (const key of AUDIT_KEYS) {
    if (parsed.audit?.[key] !== false) addError(errors, `audit.${key}`, 'must remain false');
  }
  validateNoSecrets(errors, parsed);

  return {
    valid: errors.length === 0,
    errors,
    parsed,
    evidence_field_count: evidenceFields.length,
  };
}
