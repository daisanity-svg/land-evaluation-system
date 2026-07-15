-- READ ONLY: run before applying the reports schema baseline.
-- Save the result privately with the backup record. Do not paste secrets here.

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
  count(*) filter (where report_id is null or btrim(report_id) = '') as missing_report_id,
  count(*) filter (where client is null or btrim(client) = '') as missing_client,
  count(*) filter (where land_number is null or btrim(land_number) = '') as missing_land_number,
  count(*) filter (where research_date is null or btrim(research_date::text) = '') as missing_research_date,
  count(*) filter (where report_text is null or btrim(report_text) = '') as missing_report_text,
  count(*) filter (where summary is null) as missing_summary
from public.reports;

select
  report_id,
  count(*) as duplicate_count
from public.reports
group by report_id
having count(*) > 1
order by duplicate_count desc, report_id;

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
order by trigger_name;

select
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
from pg_class
where oid = 'public.reports'::regclass;
