import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260715050000_reports_schema_baseline.sql';
const migration = readFileSync(migrationPath, 'utf8');
const preflight = readFileSync('supabase/verification/reports_preflight.sql', 'utf8');
const dataDiagnostic = readFileSync('supabase/verification/reports_data_diagnostic.sql', 'utf8');
const postflight = readFileSync('supabase/verification/reports_postflight.sql', 'utf8');
const runbook = readFileSync('docs/supabase-recovery-runbook.md', 'utf8');

const requiredColumns = [
  'report_id',
  'client',
  'land_number',
  'research_date',
  'summary',
  'report_text',
  'created_at',
  'updated_at',
];

assert.match(migration, /\bbegin\s*;/i, 'migration must run in a transaction');
assert.match(migration, /\bcommit\s*;/i, 'migration must commit explicitly');
assert.match(migration, /create table if not exists public\.reports/i);

for (const column of requiredColumns) {
  assert.match(migration, new RegExp(`add column if not exists ${column}\\b`, 'i'), `${column} must be reconciled safely`);
  assert.ok(preflight.includes(column), `${column} must appear in preflight`);
  assert.ok(postflight.includes(column), `${column} must appear in postflight`);
}

assert.match(migration, /summary jsonb/i, 'summary must remain JSONB');
assert.match(migration, /contains duplicate report_id/i, 'duplicates must stop the migration');
assert.match(migration, /contains a null or blank report_id/i, 'missing report IDs must stop the migration');
assert.match(migration, /indisunique/i, 'migration must detect an existing unique report_id index');
assert.match(migration, /create unique index reports_report_id_uidx/i, 'report_id must be unique');
assert.match(migration, /create or replace function public\.set_reports_updated_at/i);
assert.match(migration, /create trigger reports_set_updated_at/i);
assert.match(migration, /create index if not exists reports_created_at_idx/i);
assert.match(migration, /notify pgrst, 'reload schema'/i);

const forbidden = [
  /drop\s+table/i,
  /truncate(?:\s+table)?/i,
  /delete\s+from\s+public\.reports/i,
  /update\s+public\.reports/i,
  /alter\s+table\s+public\.reports\s+drop\s+column/i,
];

for (const pattern of forbidden) {
  assert.doesNotMatch(migration, pattern, `migration contains forbidden destructive SQL: ${pattern}`);
}

for (const text of [migration, preflight, dataDiagnostic, postflight, runbook]) {
  assert.doesNotMatch(text, /SUPABASE_SERVICE_ROLE_KEY\s*=/i, 'must not contain a service role key value');
  assert.doesNotMatch(text, /Authorization:\s*Bearer\s+\S+/i, 'must not contain an Authorization value');
  assert.doesNotMatch(text, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, 'must not contain a JWT-like secret');
}

assert.equal((preflight.match(/;/g) || []).length, 1, 'preflight must return one Supabase result set');
for (const check of [
  'overall_preflight',
  'required_columns_found',
  'schema_compatible',
  'duplicate_report_id_groups',
  'report_id_unique',
  'created_at_index_exists',
  'updated_at_trigger_exists',
  'rls_enabled',
]) {
  assert.ok(preflight.includes(`'${check}'`), `${check} must appear in the consolidated preflight`);
}
assert.match(preflight, /select check_name, actual, expected, passed, scope/i);
assert.match(preflight, /ready_with_legacy_review/i);
assert.match(preflight, /where scope = 'blocking'/i);
assert.match(preflight, /where scope = 'legacy_data'/i);

assert.equal((dataDiagnostic.match(/;/g) || []).length, 1, 'data diagnostic must return one Supabase result set');
for (const diagnostic of [
  'summary_sql_null',
  'summary_json_null',
  'summary_object',
  'summary_string',
  'missing_any_metadata',
  'invalid_summary_and_missing_metadata',
]) {
  assert.ok(dataDiagnostic.includes(`'${diagnostic}'`), `${diagnostic} must appear in the data diagnostic`);
}
assert.match(dataDiagnostic, /select diagnostic_name, affected_rows, severity, explanation/i);
assert.doesNotMatch(dataDiagnostic, /select\s+report_id\b/i, 'data diagnostic must not return report IDs');
assert.doesNotMatch(dataDiagnostic, /select\s+client\b/i, 'data diagnostic must not return client names');
assert.doesNotMatch(dataDiagnostic, /select\s+land_number\b/i, 'data diagnostic must not return land numbers');
assert.doesNotMatch(dataDiagnostic, /select\s+report_text\b/i, 'data diagnostic must not return report text');

assert.match(runbook, /不要在正式專案使用 `db reset`/);
assert.match(runbook, /不得進入 Git 歷史/);
assert.match(runbook, /supabase db push --dry-run/);

console.log('Supabase schema migration contract checks passed.');
