import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://land-evaluation-system.vercel.app';
const DEFAULT_REPORT_ID = 'hy-1783998431127-iairjp';
const REQUIRED_REPORT_FIELDS = [
  'report_id',
  'client',
  'land_number',
  'research_date',
  'summary',
  'report_text',
];
const REQUIRED_RESPONSE_CODES = ['200', '201', '400', '401', '403', '500', '502'];
const REQUIRED_SUCCESS_FIELDS = [
  'success',
  'saved',
  'verified',
  'operation',
  'report_id',
  'request_id',
  'message',
];

export class ProductionSmokeCheckError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProductionSmokeCheckError';
  }
}

function assertCondition(condition, message) {
  if (!condition) throw new ProductionSmokeCheckError(message);
}

function includesEvery(values, requiredValues) {
  return Array.isArray(values) && requiredValues.every((value) => values.includes(value));
}

function responseMayContainSecret(text) {
  const jwt = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/;
  const bearerCredential = /\bBearer\s+[A-Za-z0-9._~-]{12,}/i;
  const serviceCredential = /service[_-]?role(?:[_-]?key)?["'\s:=]+[A-Za-z0-9._~-]{12,}/i;
  return jwt.test(text) || bearerCredential.test(text) || serviceCredential.test(text);
}

function safeJson(text, checkName) {
  try {
    return JSON.parse(text);
  } catch {
    throw new ProductionSmokeCheckError(`${checkName}: response is not valid JSON.`);
  }
}

async function fetchWithRetry({
  fetchImpl,
  url,
  checkName,
  attempts,
  retryDelayMs,
  timeoutMs,
}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json, text/html;q=0.9' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status < 500 || attempt === attempts) return response;
    } catch {
      if (attempt === attempts) {
        throw new ProductionSmokeCheckError(`${checkName}: request failed after ${attempts} attempts.`);
      }
    }

    if (retryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new ProductionSmokeCheckError(`${checkName}: request failed.`);
}

async function readEndpoint(options, path, checkName) {
  const response = await fetchWithRetry({
    ...options,
    url: new URL(path, options.baseUrl),
    checkName,
  });
  let text;
  try {
    text = await response.text();
  } catch {
    throw new ProductionSmokeCheckError(`${checkName}: response body could not be read.`);
  }

  assertCondition(text.length <= 1_000_000, `${checkName}: response body is unexpectedly large.`);
  assertCondition(!responseMayContainSecret(text), `${checkName}: response appears to contain a credential.`);
  return { response, text };
}

async function checkHomepage(options) {
  const checkName = 'homepage';
  const { response, text } = await readEndpoint(options, '/', checkName);
  assertCondition(response.status === 200, `${checkName}: expected HTTP 200.`);
  const contentType = response.headers?.get?.('content-type') || '';
  assertCondition(contentType.includes('text/html') || /<!doctype html|<html/i.test(text), `${checkName}: expected HTML.`);
}

async function checkApplicationHealth(options) {
  const checkName = 'application health';
  const { response, text } = await readEndpoint(options, '/api/health', checkName);
  assertCondition(response.status === 200, `${checkName}: expected HTTP 200.`);
  const body = safeJson(text, checkName);
  assertCondition(body?.ok === true, `${checkName}: ok must be true.`);
  assertCondition(body?.status === 'healthy', `${checkName}: status must be healthy.`);
  assertCondition(body?.service === 'land-evaluation-system', `${checkName}: service name is incorrect.`);
}

async function checkSupabaseHealth(options) {
  const checkName = 'Supabase health';
  const { response, text } = await readEndpoint(options, '/api/health-supabase', checkName);
  assertCondition(response.status === 200, `${checkName}: expected HTTP 200.`);
  const body = safeJson(text, checkName);
  assertCondition(body?.ok === true, `${checkName}: ok must be true.`);
  assertCondition(body?.supabase?.configured === true, `${checkName}: Supabase must be configured.`);
  assertCondition(body?.supabase?.ok === true, `${checkName}: Supabase query must succeed.`);
  assertCondition(body?.supabase?.status === 200, `${checkName}: Supabase REST status must be 200.`);
}

async function checkOpenApi(options) {
  const checkName = 'OpenAPI contract';
  const { response, text } = await readEndpoint(options, '/api/openapi', checkName);
  assertCondition(response.status === 200, `${checkName}: expected HTTP 200.`);
  const spec = safeJson(text, checkName);
  const submit = spec?.paths?.['/api/reports']?.post;
  const requestSchema = submit?.requestBody?.content?.['application/json']?.schema;
  const successSchema = spec?.components?.schemas?.SubmitSuccess;

  assertCondition(spec?.openapi === '3.1.0', `${checkName}: OpenAPI version must be 3.1.0.`);
  assertCondition(submit?.operationId === 'submitReport', `${checkName}: submitReport operation is missing.`);
  assertCondition(
    includesEvery(requestSchema?.required, REQUIRED_REPORT_FIELDS),
    `${checkName}: submitReport required fields are incomplete.`,
  );
  assertCondition(
    includesEvery(Object.keys(submit?.responses || {}), REQUIRED_RESPONSE_CODES),
    `${checkName}: submitReport response codes are incomplete.`,
  );
  assertCondition(
    includesEvery(successSchema?.required, REQUIRED_SUCCESS_FIELDS),
    `${checkName}: verified success schema is incomplete.`,
  );
}

async function checkReportStatus(options) {
  const checkName = 'safe report status';
  const path = `/api/reports/${encodeURIComponent(options.reportId)}/status`;
  const { response, text } = await readEndpoint(options, path, checkName);
  assertCondition(response.status === 200, `${checkName}: expected HTTP 200.`);
  const body = safeJson(text, checkName);

  assertCondition(body?.exists === true, `${checkName}: monitored report does not exist.`);
  assertCondition(body?.report_id === options.reportId, `${checkName}: report_id does not match.`);
  assertCondition(body?.has_report_text === true, `${checkName}: report text is unavailable.`);
  assertCondition(Number.isInteger(body?.report_text_length) && body.report_text_length > 0, `${checkName}: report text length is invalid.`);
  assertCondition(body?.has_summary === true, `${checkName}: summary is unavailable.`);
  assertCondition(!Object.hasOwn(body, 'report_text'), `${checkName}: full report text must not be public.`);
}

export async function runProductionSmokeChecks({
  baseUrl = DEFAULT_BASE_URL,
  reportId = DEFAULT_REPORT_ID,
  fetchImpl = globalThis.fetch,
  attempts = 3,
  retryDelayMs = 500,
  timeoutMs = 15_000,
  onCheckPassed = () => {},
} = {}) {
  assertCondition(typeof fetchImpl === 'function', 'A fetch implementation is required.');
  assertCondition(Number.isInteger(attempts) && attempts > 0, 'Retry attempts must be a positive integer.');

  const normalizedBaseUrl = new URL(baseUrl);
  const options = {
    baseUrl: normalizedBaseUrl,
    reportId: String(reportId || '').trim(),
    fetchImpl,
    attempts,
    retryDelayMs,
    timeoutMs,
  };
  assertCondition(options.reportId.length > 0, 'A monitored report_id is required.');

  const checks = [
    ['homepage', checkHomepage],
    ['application_health', checkApplicationHealth],
    ['supabase_health', checkSupabaseHealth],
    ['openapi_contract', checkOpenApi],
    ['safe_report_status', checkReportStatus],
  ];

  const passed = [];
  for (const [name, check] of checks) {
    await check(options);
    passed.push(name);
    onCheckPassed(name);
  }

  return { ok: true, checked: passed };
}

async function main() {
  try {
    const result = await runProductionSmokeChecks({
      baseUrl: process.env.PRODUCTION_BASE_URL || DEFAULT_BASE_URL,
      reportId: process.env.MONITOR_REPORT_ID || DEFAULT_REPORT_ID,
      onCheckPassed: (name) => console.log(`PASS ${name}`),
    });
    console.log(`Production smoke check passed (${result.checked.length} checks).`);
  } catch (error) {
    const message = error instanceof ProductionSmokeCheckError
      ? error.message
      : 'Production smoke check failed unexpectedly.';
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
