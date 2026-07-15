-- Canonical, non-destructive baseline for the report storage contract.
-- This migration never deletes or rewrites report content. It aborts if
-- report_id cannot safely become the unique upsert key.

begin;

set local lock_timeout = '5s';

create table if not exists public.reports (
  report_id text primary key,
  client text not null,
  land_number text not null,
  research_date text not null,
  summary jsonb not null,
  report_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reconcile an existing table without changing stored report values.
alter table public.reports add column if not exists report_id text;
alter table public.reports add column if not exists client text;
alter table public.reports add column if not exists land_number text;
alter table public.reports add column if not exists research_date text;
alter table public.reports add column if not exists summary jsonb;
alter table public.reports add column if not exists report_text text;
alter table public.reports add column if not exists created_at timestamptz;
alter table public.reports add column if not exists updated_at timestamptz;

-- Refuse implicit type conversions. A mismatch needs a separately reviewed
-- migration because converting report content can be lossy.
do $migration$
declare
  mismatches text;
begin
  select string_agg(
    format('%I is %s; expected %s', expected.column_name,
      coalesce(actual.data_type, 'missing'),
      array_to_string(expected.allowed_types, ' or ')),
    '; '
  )
  into mismatches
  from (values
    ('report_id', array['text', 'character varying']::text[]),
    ('client', array['text', 'character varying']::text[]),
    ('land_number', array['text', 'character varying']::text[]),
    ('research_date', array['text', 'character varying', 'date']::text[]),
    ('summary', array['jsonb']::text[]),
    ('report_text', array['text', 'character varying']::text[]),
    ('created_at', array['timestamp with time zone']::text[]),
    ('updated_at', array['timestamp with time zone']::text[])
  ) as expected(column_name, allowed_types)
  left join information_schema.columns as actual
    on actual.table_schema = 'public'
    and actual.table_name = 'reports'
    and actual.column_name = expected.column_name
  where actual.column_name is null
    or not (actual.data_type = any(expected.allowed_types));

  if mismatches is not null then
    raise exception 'public.reports schema mismatch: %', mismatches;
  end if;
end
$migration$;

-- Upsert depends on one non-empty, unique report_id per record. Stop safely
-- instead of choosing which duplicate or unidentified report to keep.
do $migration$
begin
  if exists (
    select 1
    from public.reports
    where report_id is null or btrim(report_id) = ''
  ) then
    raise exception 'public.reports contains a null or blank report_id; migration stopped without changing data';
  end if;

  if exists (
    select 1
    from public.reports
    group by report_id
    having count(*) > 1
  ) then
    raise exception 'public.reports contains duplicate report_id values; migration stopped without changing data';
  end if;
end
$migration$;

alter table public.reports alter column report_id set not null;
alter table public.reports alter column summary set default '{}'::jsonb;
alter table public.reports alter column created_at set default now();
alter table public.reports alter column updated_at set default now();

-- Do not create a redundant unique index when report_id is already a primary
-- key or has another valid single-column unique index.
do $migration$
begin
  if not exists (
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
  ) then
    create unique index reports_report_id_uidx
      on public.reports (report_id);
  end if;
end
$migration$;

create or replace function public.set_reports_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end
$function$;

drop trigger if exists reports_set_updated_at on public.reports;

create trigger reports_set_updated_at
before update on public.reports
for each row
execute function public.set_reports_updated_at();

create index if not exists reports_created_at_idx
on public.reports (created_at desc);

comment on table public.reports is
  'Verified land-evaluation reports keyed by report_id.';

notify pgrst, 'reload schema';

commit;
