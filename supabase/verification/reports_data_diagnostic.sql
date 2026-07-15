-- READ ONLY: classify legacy reports that stopped reports_preflight.sql.
-- Returns aggregate counts only. It never returns client names, land numbers,
-- report IDs, summaries, or report text.

with report_stats as (
  select
    count(*) as total_reports,
    count(*) filter (where summary is null) as summary_sql_null,
    count(*) filter (where summary = 'null'::jsonb) as summary_json_null,
    count(*) filter (where jsonb_typeof(summary) = 'object') as summary_object,
    count(*) filter (where jsonb_typeof(summary) = 'string') as summary_string,
    count(*) filter (where jsonb_typeof(summary) = 'array') as summary_array,
    count(*) filter (where jsonb_typeof(summary) in ('number', 'boolean')) as summary_scalar,
    count(*) filter (
      where jsonb_typeof(summary) = 'object'
        and summary ?& array[
          'location', 'land_number', 'zoning', 'area',
          'road', 'price', 'product', 'conclusion'
        ]
    ) as summary_object_with_all_keys,
    count(*) filter (
      where jsonb_typeof(summary) = 'object'
        and exists (
          select 1
          from unnest(array[
            'location', 'land_number', 'zoning', 'area',
            'road', 'price', 'product', 'conclusion'
          ]) as required_key
          where nullif(btrim(summary ->> required_key), '') is null
        )
    ) as summary_object_with_empty_value,
    count(*) filter (where client is null or btrim(client) = '') as missing_client,
    count(*) filter (where land_number is null or btrim(land_number) = '') as missing_land_number,
    count(*) filter (where research_date is null or btrim(research_date::text) = '') as missing_research_date,
    count(*) filter (
      where client is null or btrim(client) = ''
        or land_number is null or btrim(land_number) = ''
        or research_date is null or btrim(research_date::text) = ''
    ) as missing_any_metadata,
    count(*) filter (
      where (client is null or btrim(client) = '')
        and (land_number is null or btrim(land_number) = '')
        and (research_date is null or btrim(research_date::text) = '')
    ) as missing_all_metadata,
    count(*) filter (
      where jsonb_typeof(summary) is distinct from 'object'
        and (
          client is null or btrim(client) = ''
          or land_number is null or btrim(land_number) = ''
          or research_date is null or btrim(research_date::text) = ''
        )
    ) as invalid_summary_and_missing_metadata,
    count(*) filter (where created_at is null) as missing_created_at,
    count(*) filter (where updated_at is null) as missing_updated_at
  from public.reports
),
diagnostics(display_order, diagnostic_name, affected_rows, severity, explanation) as (
  select 10, 'total_reports', total_reports, 'information', 'Current row count.' from report_stats
  union all select 20, 'summary_sql_null', summary_sql_null, 'needs_review', 'Legacy rows with SQL NULL summary.' from report_stats
  union all select 21, 'summary_json_null', summary_json_null, 'needs_review', 'Rows containing JSON null.' from report_stats
  union all select 22, 'summary_string', summary_string, 'needs_review', 'Rows containing a JSON string instead of an object.' from report_stats
  union all select 23, 'summary_array', summary_array, 'needs_review', 'Rows containing a JSON array instead of an object.' from report_stats
  union all select 24, 'summary_scalar', summary_scalar, 'needs_review', 'Rows containing a number or boolean.' from report_stats
  union all select 30, 'summary_object', summary_object, 'information', 'Rows already stored as JSON objects.' from report_stats
  union all select 31, 'summary_object_with_all_keys', summary_object_with_all_keys, 'information', 'Object summaries containing all eight canonical keys.' from report_stats
  union all select 32, 'summary_object_with_empty_value', summary_object_with_empty_value, 'information', 'Object summaries with at least one empty canonical value.' from report_stats
  union all select 40, 'missing_client', missing_client, 'needs_review', 'Rows with blank or NULL client.' from report_stats
  union all select 41, 'missing_land_number', missing_land_number, 'needs_review', 'Rows with blank or NULL land number.' from report_stats
  union all select 42, 'missing_research_date', missing_research_date, 'needs_review', 'Rows with blank or NULL research date.' from report_stats
  union all select 43, 'missing_any_metadata', missing_any_metadata, 'needs_review', 'Distinct rows missing at least one required metadata field.' from report_stats
  union all select 44, 'missing_all_metadata', missing_all_metadata, 'needs_review', 'Rows missing all three metadata fields.' from report_stats
  union all select 45, 'invalid_summary_and_missing_metadata', invalid_summary_and_missing_metadata, 'needs_review', 'Rows affected by both conditions.' from report_stats
  union all select 50, 'missing_created_at', missing_created_at, 'needs_review', 'Rows without a creation timestamp.' from report_stats
  union all select 51, 'missing_updated_at', missing_updated_at, 'needs_review', 'Rows without an update timestamp.' from report_stats
)
select diagnostic_name, affected_rows, severity, explanation
from diagnostics
order by display_order;
