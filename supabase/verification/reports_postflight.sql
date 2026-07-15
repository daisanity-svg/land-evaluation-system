-- READ ONLY: run immediately after the reports schema baseline.

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'reports'
  and column_name in (
    'report_id', 'client', 'land_number', 'research_date',
    'summary', 'report_text', 'created_at', 'updated_at'
  )
order by ordinal_position;

select
  count(*) as total_reports,
  count(distinct report_id) as distinct_report_ids,
  count(*) filter (where report_id is null or btrim(report_id) = '') as invalid_report_ids
from public.reports;

select report_id, count(*) as duplicate_count
from public.reports
group by report_id
having count(*) > 1;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'reports'
order by indexname;

select
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'reports'
  and trigger_name = 'reports_set_updated_at';

select
  report_id,
  client,
  land_number,
  research_date,
  report_text is not null and length(report_text) > 0 as has_report_text,
  length(coalesce(report_text, '')) as report_text_length,
  summary is not null and jsonb_typeof(summary) = 'object' as has_summary,
  created_at,
  updated_at
from public.reports
order by created_at desc nulls last
limit 5;
