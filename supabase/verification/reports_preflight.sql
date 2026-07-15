-- READ ONLY: run before applying the reports schema baseline.
-- Returns one result set and never exposes client names, land numbers,
-- report IDs, summaries, or report text.

with required_columns(column_name, allowed_types) as (
  values
    ('report_id', array['text', 'character varying']::text[]),
    ('client', array['text', 'character varying']::text[]),
    ('land_number', array['text', 'character varying']::text[]),
    ('research_date', array['text', 'character varying', 'date']::text[]),
    ('summary', array['jsonb']::text[]),
    ('report_text', array['text', 'character varying']::text[]),
    ('created_at', array['timestamp with time zone']::text[]),
    ('updated_at', array['timestamp with time zone']::text[])
),
column_checks as (
  select
    count(actual.column_name) as required_columns_found,
    bool_and(coalesce(actual.data_type = any(required.allowed_types), false)) as schema_compatible,
    max(actual.data_type) filter (where required.column_name = 'report_id') as report_id_type,
    max(actual.data_type) filter (where required.column_name = 'client') as client_type,
    max(actual.data_type) filter (where required.column_name = 'land_number') as land_number_type,
    max(actual.data_type) filter (where required.column_name = 'research_date') as research_date_type,
    max(actual.data_type) filter (where required.column_name = 'summary') as summary_type,
    max(actual.data_type) filter (where required.column_name = 'report_text') as report_text_type,
    max(actual.data_type) filter (where required.column_name = 'created_at') as created_at_type,
    max(actual.data_type) filter (where required.column_name = 'updated_at') as updated_at_type
  from required_columns as required
  left join information_schema.columns as actual
    on actual.table_schema = 'public'
    and actual.table_name = 'reports'
    and actual.column_name = required.column_name
),
report_rows as (
  select to_jsonb(report) as row_data
  from public.reports as report
),
report_checks as (
  select
    count(*) as total_reports,
    count(*) filter (where nullif(btrim(row_data ->> 'report_id'), '') is null) as missing_report_id,
    count(*) filter (where nullif(btrim(row_data ->> 'client'), '') is null) as missing_client,
    count(*) filter (where nullif(btrim(row_data ->> 'land_number'), '') is null) as missing_land_number,
    count(*) filter (where nullif(btrim(row_data ->> 'research_date'), '') is null) as missing_research_date,
    count(*) filter (where nullif(btrim(row_data ->> 'report_text'), '') is null) as missing_report_text,
    count(*) filter (where jsonb_typeof(row_data -> 'summary') is distinct from 'object') as invalid_summary
  from report_rows
),
duplicate_checks as (
  select count(*) as duplicate_report_id_groups
  from (
    select row_data ->> 'report_id'
    from report_rows
    where nullif(btrim(row_data ->> 'report_id'), '') is not null
    group by row_data ->> 'report_id'
    having count(*) > 1
  ) as duplicates
),
structure_checks as (
  select
    exists (
      select 1
      from pg_catalog.pg_index as index_info
      join pg_catalog.pg_class as table_info
        on table_info.oid = index_info.indrelid
      join pg_catalog.pg_namespace as namespace_info
        on namespace_info.oid = table_info.relnamespace
      where namespace_info.nspname = 'public'
        and table_info.relname = 'reports'
        and index_info.indisunique
        and index_info.indisvalid
        and index_info.indpred is null
        and index_info.indexprs is null
        and (
          select array_agg(attribute_info.attname::text order by key_info.ordinality)
          from unnest(index_info.indkey::smallint[]) with ordinality
            as key_info(attnum, ordinality)
          join pg_catalog.pg_attribute as attribute_info
            on attribute_info.attrelid = table_info.oid
            and attribute_info.attnum = key_info.attnum
          where key_info.attnum > 0
        ) = array['report_id']::text[]
    ) as report_id_unique,
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'reports'
        and indexname = 'reports_created_at_idx'
    ) as created_at_index_exists,
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema = 'public'
        and event_object_table = 'reports'
        and trigger_name = 'reports_set_updated_at'
        and event_manipulation = 'UPDATE'
        and action_timing = 'BEFORE'
    ) as updated_at_trigger_exists
),
security_checks as (
  select
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
  from pg_class
  where oid = 'public.reports'::regclass
),
checks(check_order, check_name, actual, expected, passed, scope) as (
  select 10, 'required_columns_found', required_columns_found::text, '8', required_columns_found = 8, 'blocking' from column_checks
  union all select 11, 'schema_compatible', schema_compatible::text, 'true', schema_compatible, 'blocking' from column_checks
  union all select 12, 'report_id_type', coalesce(report_id_type, 'missing'), 'text or character varying', coalesce(report_id_type in ('text', 'character varying'), false), 'blocking' from column_checks
  union all select 13, 'client_type', coalesce(client_type, 'missing'), 'text or character varying', coalesce(client_type in ('text', 'character varying'), false), 'blocking' from column_checks
  union all select 14, 'land_number_type', coalesce(land_number_type, 'missing'), 'text or character varying', coalesce(land_number_type in ('text', 'character varying'), false), 'blocking' from column_checks
  union all select 15, 'research_date_type', coalesce(research_date_type, 'missing'), 'text, character varying, or date', coalesce(research_date_type in ('text', 'character varying', 'date'), false), 'blocking' from column_checks
  union all select 16, 'summary_type', coalesce(summary_type, 'missing'), 'jsonb', coalesce(summary_type = 'jsonb', false), 'blocking' from column_checks
  union all select 17, 'report_text_type', coalesce(report_text_type, 'missing'), 'text or character varying', coalesce(report_text_type in ('text', 'character varying'), false), 'blocking' from column_checks
  union all select 18, 'created_at_type', coalesce(created_at_type, 'missing'), 'timestamp with time zone', coalesce(created_at_type = 'timestamp with time zone', false), 'blocking' from column_checks
  union all select 19, 'updated_at_type', coalesce(updated_at_type, 'missing'), 'timestamp with time zone', coalesce(updated_at_type = 'timestamp with time zone', false), 'blocking' from column_checks
  union all select 20, 'total_reports', total_reports::text, 'informational', true, 'information' from report_checks
  union all select 21, 'missing_report_id', missing_report_id::text, '0', missing_report_id = 0, 'blocking' from report_checks
  union all select 22, 'missing_client', missing_client::text, '0', missing_client = 0, 'legacy_data' from report_checks
  union all select 23, 'missing_land_number', missing_land_number::text, '0', missing_land_number = 0, 'legacy_data' from report_checks
  union all select 24, 'missing_research_date', missing_research_date::text, '0', missing_research_date = 0, 'legacy_data' from report_checks
  union all select 25, 'missing_report_text', missing_report_text::text, '0', missing_report_text = 0, 'blocking' from report_checks
  union all select 26, 'invalid_summary', invalid_summary::text, '0', invalid_summary = 0, 'legacy_data' from report_checks
  union all select 30, 'duplicate_report_id_groups', duplicate_report_id_groups::text, '0', duplicate_report_id_groups = 0, 'blocking' from duplicate_checks
  union all select 31, 'report_id_unique', report_id_unique::text, 'true', report_id_unique, 'blocking' from structure_checks
  union all select 32, 'created_at_index_exists', created_at_index_exists::text, 'true', created_at_index_exists, 'blocking' from structure_checks
  union all select 33, 'updated_at_trigger_exists', updated_at_trigger_exists::text, 'true', updated_at_trigger_exists, 'blocking' from structure_checks
  union all select 40, 'rls_enabled', rls_enabled::text, 'true', rls_enabled, 'blocking' from security_checks
  union all select 41, 'rls_forced', rls_forced::text, 'informational', true, 'information' from security_checks
),
overall as (
  select
    bool_and(coalesce(passed, false)) filter (where scope = 'blocking') as blocking_ready,
    bool_and(coalesce(passed, false)) filter (where scope = 'legacy_data') as legacy_clean
  from checks
)
select check_name, actual, expected, passed, scope
from (
  select
    0 as check_order,
    'overall_preflight' as check_name,
    case
      when not blocking_ready then 'stop'
      when legacy_clean then 'ready'
      else 'ready_with_legacy_review'
    end as actual,
    'ready or ready_with_legacy_review' as expected,
    blocking_ready as passed,
    'overall' as scope
  from overall
  union all
  select check_order, check_name, actual, expected, passed, scope
  from checks
) as final_checks
order by
  case
    when check_order = 0 then 0
    when scope = 'blocking' and passed = false then 1
    when scope = 'legacy_data' and passed = false then 2
    else 3
  end,
  check_order,
  check_name;
