const EVIDENCE_STATUSES = new Set([
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

const REQUIRED_EVIDENCE_KEYS = [
  'field',
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

const REQUIRED_BOUNDARY_KEYS = [
  'boundary_type',
  'road_name',
  'planned_road_width',
  'current_road_width',
  'adjacent_parcel',
  'adjacent_land_use',
  'neighboring_building_type',
  'neighboring_building_floors',
];

const CRITICAL_LEGAL_FIELDS = [
  'zoning',
  'building_coverage_ratio',
  'floor_area_ratio',
  'legal_source',
];

const ACCEPTED_DEFINITE_STATUSES = new Set(['official_confirmed', 'corroborated']);
const BLOCKING_STATUSES = new Set(['conflict', 'needs_manual_review', 'unavailable']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function collectEvidenceFields(packageData) {
  const result = [];
  const roots = [
    ['fields', packageData.fields],
    ['boundaries', packageData.boundaries],
    ['ownership_and_adjacent', packageData.ownership_and_adjacent],
    ['life_circle', packageData.life_circle],
  ];

  function visit(path, value) {
    if (!isObject(value)) return;
    if (hasOwn(value, 'field') || hasOwn(value, 'status')) {
      result.push({ path, value });
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(`${path}.${key}`, child);
  }

  for (const [path, root] of roots) visit(path, root);
  return result;
}

function validateEvidenceField(errors, path, field) {
  if (!isObject(field)) {
    addError(errors, path, 'must be an evidence object');
    return;
  }

  for (const key of REQUIRED_EVIDENCE_KEYS) {
    if (!hasOwn(field, key)) addError(errors, path, `missing ${key}`);
  }

  if (!EVIDENCE_STATUSES.has(field.status)) addError(errors, path, 'invalid or missing status');
  if (!SOURCE_TYPES.has(field.source_type)) addError(errors, path, 'invalid or missing source_type');
  if (typeof field.field !== 'string' || !field.field.trim()) addError(errors, path, 'field must be non-empty');
  if (typeof field.evidence !== 'string' || !field.evidence.trim()) addError(errors, path, 'evidence must be non-empty');
  if (!Number.isFinite(field.confidence) || field.confidence < 0 || field.confidence > 100) {
    addError(errors, path, 'confidence must be between 0 and 100');
  }
  if (!Array.isArray(field.conflicts)) addError(errors, path, 'conflicts must be an array');

  if (field.status === 'official_confirmed') {
    if (!['government', 'first_party'].includes(field.source_type)) {
      addError(errors, path, 'official_confirmed requires a government or first_party source');
    }
    if (!String(field.source_name || '').trim()) addError(errors, path, 'official_confirmed requires source_name');
    if (!String(field.source_url || '').trim()) addError(errors, path, 'official_confirmed requires source_url');
    if (field.normalized_value === null || field.normalized_value === undefined) {
      addError(errors, path, 'official_confirmed requires a normalized value');
    }
  }

  if (field.status === 'conflict') {
    if (field.normalized_value !== null) addError(errors, path, 'conflict must not be auto-resolved');
    if (!Array.isArray(field.conflicts) || field.conflicts.length < 2) {
      addError(errors, path, 'conflict requires at least two source claims');
    }
    if (!String(field.manual_review_reason || '').trim()) {
      addError(errors, path, 'conflict requires manual_review_reason');
    }
  }

  if (['needs_manual_review', 'unavailable'].includes(field.status)) {
    if (field.normalized_value !== null) addError(errors, path, `${field.status} must not be auto-filled`);
    if (!String(field.manual_review_reason || '').trim()) {
      addError(errors, path, `${field.status} requires manual_review_reason`);
    }
  }

  if (['official_confirmed', 'corroborated', 'inferred'].includes(field.status)
    && (field.normalized_value === null || field.normalized_value === undefined)) {
    addError(errors, path, `${field.status} requires a normalized value`);
  }
}

function validateParcelNormalization(errors, caseData) {
  if (!isObject(caseData)) {
    addError(errors, 'case', 'must be an object');
    return;
  }
  const normalized = caseData.normalized_land_numbers;
  const parcels = caseData.parcel_numbers;
  if (!Array.isArray(normalized) || !normalized.length) {
    addError(errors, 'case.normalized_land_numbers', 'must contain normalized land numbers');
    return;
  }
  if (!Array.isArray(parcels) || !parcels.length) {
    addError(errors, 'case.parcel_numbers', 'must contain parcel numbers');
    return;
  }
  if (normalized.length !== parcels.length) {
    addError(errors, 'case.normalized_land_numbers', 'must have exactly one entry per parcel');
  }

  const prefix = `${caseData.county || ''}${caseData.district || ''}${caseData.land_section || ''}`;
  for (const parcel of parcels) {
    const matches = normalized.filter((value) => String(value).includes(prefix) && String(value).includes(`${parcel}地號`));
    if (matches.length !== 1) {
      addError(errors, 'case.normalized_land_numbers', `parcel ${parcel} must appear exactly once with full jurisdiction and section`);
    }
  }
}

function validateBoundaries(errors, boundaries) {
  if (!isObject(boundaries)) {
    addError(errors, 'boundaries', 'must be an object');
    return;
  }
  for (const direction of ['east', 'south', 'west', 'north']) {
    const boundary = boundaries[direction];
    if (!isObject(boundary)) {
      addError(errors, `boundaries.${direction}`, 'is required');
      continue;
    }
    for (const key of REQUIRED_BOUNDARY_KEYS) {
      if (!isObject(boundary[key])) addError(errors, `boundaries.${direction}.${key}`, 'is required');
    }
    const planned = boundary.planned_road_width;
    const current = boundary.current_road_width;
    if (planned && current) {
      if (planned === current || planned.field === current.field) {
        addError(errors, `boundaries.${direction}`, 'planned and current road widths must be separate evidence fields');
      }
      if (!String(planned.field || '').includes('planned_road_width')) {
        addError(errors, `boundaries.${direction}.planned_road_width`, 'field name must identify planned road width');
      }
      if (!String(current.field || '').includes('current_road_width')) {
        addError(errors, `boundaries.${direction}.current_road_width`, 'field name must identify current road width');
      }
    }
  }
}

function validateCompetitors(errors, competitors) {
  if (!Array.isArray(competitors) || competitors.length < 3 || competitors.length > 5) {
    addError(errors, 'competitors', 'must contain 3 to 5 comparable projects');
    return;
  }

  competitors.forEach((competitor, index) => {
    const path = `competitors[${index}]`;
    if (!isObject(competitor)) {
      addError(errors, path, 'must be an object');
      return;
    }
    if (!String(competitor.project_name || '').trim()) addError(errors, path, 'project_name is required');
    if (!String(competitor.selection_reason || '').trim()) addError(errors, path, 'selection_reason is required');
    if (!EVIDENCE_STATUSES.has(competitor.status)) addError(errors, path, 'invalid or missing status');
    if (!Array.isArray(competitor.data_sources) || !competitor.data_sources.length) {
      addError(errors, path, 'at least one data source is required');
    }
    if (!Array.isArray(competitor.missing_fields)) addError(errors, path, 'missing_fields must be an array');

    for (const key of ['developer', 'parking_type', 'parking_price']) {
      const missing = competitor[key] === null || competitor[key] === undefined || competitor[key] === '';
      if (missing && !competitor.missing_fields?.includes(key)) {
        addError(errors, path, `${key} is missing and must be declared instead of fabricated`);
      }
    }
  });
}

function validateQualityDecisions(errors, packageData) {
  const gate = packageData.quality_gate;
  const gateMissing = !hasOwn(packageData || {}, 'quality_gate');
  const gateInvalid = !isObject(gate);
  if (gateMissing) {
    addError(errors, 'quality_gate', 'is required');
    return;
  }
  if (gateInvalid) {
    addError(errors, 'quality_gate', 'must be an object');
    return;
  }

  const areaFields = ['parcel_area_each', 'parcel_area_total_sqm', 'parcel_area_total_ping']
    .map((key) => packageData.fields?.[key]);
  const areaIsDefinite = areaFields.every((field) => field
    && ACCEPTED_DEFINITE_STATUSES.has(field.status)
    && field.normalized_value !== null
    && field.normalized_value !== undefined);
  if (!areaIsDefinite && gate.allow_definite_volume !== false) {
    addError(errors, 'quality_gate.allow_definite_volume', 'must be false until parcel area is corroborated or officially confirmed');
  }

  const legalIsDefinite = CRITICAL_LEGAL_FIELDS.every((key) => {
    const field = packageData.fields?.[key];
    return field && ACCEPTED_DEFINITE_STATUSES.has(field.status) && field.normalized_value !== null;
  });
  if (!legalIsDefinite && gate.allow_definite_legal_conclusion !== false) {
    addError(errors, 'quality_gate.allow_definite_legal_conclusion', 'must be false while critical legal fields are unresolved');
  }

  const pricing = packageData.pricing;
  if (!isObject(pricing)) {
    addError(errors, 'pricing', 'must be an object');
  } else {
    const pricingBlocked = BLOCKING_STATUSES.has(pricing.pricing_status);
    if (pricingBlocked) {
      for (const key of ['proposed_residential_price', 'proposed_storefront_price', 'proposed_parking_price']) {
        if (pricing[key] !== null) addError(errors, `pricing.${key}`, 'must be null while pricing is unresolved');
      }
      if (gate.allow_definite_price !== false) {
        addError(errors, 'quality_gate.allow_definite_price', 'must be false while pricing is unresolved');
      }
    }
  }

  const criticalFields = [
    packageData.fields?.parcel_area_total_sqm,
    ...CRITICAL_LEGAL_FIELDS.map((key) => packageData.fields?.[key]),
  ];
  const formalBlocked = criticalFields.some((field) => !field || BLOCKING_STATUSES.has(field.status));
  if (formalBlocked && gate.allow_formal_report !== false) {
    addError(errors, 'quality_gate.allow_formal_report', 'must be false while a critical field is unresolved');
  }
  if (!Array.isArray(gate.blocking_reasons) || (formalBlocked && gate.blocking_reasons.length === 0)) {
    addError(errors, 'quality_gate.blocking_reasons', 'must explain why formal output is blocked');
  }
}

function validateAudit(errors, audit) {
  if (!isObject(audit)) {
    addError(errors, 'audit', 'must be an object');
    return;
  }
  for (const key of [
    'research_date_difference_is_defect',
    'submitReport_called',
    'supabase_written',
    'production_modified',
    'main_modified',
    'formal_report_contract_modified',
    'sensitive_data_present',
  ]) {
    if (audit[key] !== false) addError(errors, `audit.${key}`, 'must remain false in Phase 2A');
  }
  if (!Array.isArray(audit.hermes_run_ids) || audit.hermes_run_ids.length === 0) {
    addError(errors, 'audit.hermes_run_ids', 'must record the read-only Hermes attempts');
  }
}

function validateNoSecrets(errors, packageData) {
  const text = JSON.stringify(packageData);
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

export function evaluateResearchQuality(packageData) {
  const errors = [];
  const warnings = [];
  if (!isObject(packageData)) return { valid: false, errors: ['root: must be an object'], warnings, decisions: {} };

  if (packageData.schema_version !== '1.0.0-phase2a') addError(errors, 'schema_version', 'unsupported schema version');
  if (!String(packageData.package_id || '').trim()) addError(errors, 'package_id', 'is required');

  validateParcelNormalization(errors, packageData.case);
  validateBoundaries(errors, packageData.boundaries);
  validateCompetitors(errors, packageData.competitors);

  const evidenceFields = collectEvidenceFields(packageData);
  if (!evidenceFields.length) addError(errors, 'fields', 'no evidence fields found');
  evidenceFields.forEach(({ path, value }) => validateEvidenceField(errors, path, value));

  validateQualityDecisions(errors, packageData);
  validateAudit(errors, packageData.audit);
  validateNoSecrets(errors, packageData);

  const statusCounts = Object.fromEntries([...EVIDENCE_STATUSES].map((status) => [status, 0]));
  evidenceFields.forEach(({ value }) => {
    if (hasOwn(statusCounts, value.status)) statusCounts[value.status] += 1;
  });
  if (statusCounts.inferred > 0) warnings.push(`${statusCounts.inferred} evidence fields remain inferred`);
  const manualCount = statusCounts.conflict + statusCounts.needs_manual_review + statusCounts.unavailable;
  if (manualCount > 0) warnings.push(`${manualCount} evidence fields remain blocked or require manual review`);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    decisions: {
      allow_formal_report: packageData.quality_gate?.allow_formal_report ?? false,
      allow_definite_volume: packageData.quality_gate?.allow_definite_volume ?? false,
      allow_definite_legal_conclusion: packageData.quality_gate?.allow_definite_legal_conclusion ?? false,
      allow_definite_price: packageData.quality_gate?.allow_definite_price ?? false,
      evidence_status_counts: statusCounts,
    },
  };
}
