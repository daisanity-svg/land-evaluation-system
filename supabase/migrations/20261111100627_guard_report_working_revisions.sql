begin;
-- Additive, no data rewrite. Existing reports without a working revision
-- retain their old save path. Protect against all concurrent report writers.
create function public.land_guard_working_revisions()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  old_revision text := old.summary->>'_working_revision';
  new_revision text := new.summary->>'_working_revision';
  expected_revision text := new.summary->>'_working_base';
begin
  if old_revision is distinct from expected_revision
     or (old_revision is not null and new_revision is null)
     or (old_revision is not null and new_revision = old_revision
         and old.summary->'_working_fields' is distinct from new.summary->'_working_fields')
  then raise exception using errcode='40001',message='working revision changed'; end if;
  if new.summary ? '_working_base' then
    new.summary := new.summary - '_working_base';
  end if;
  return new;
end $$;
create trigger land_guard_working_revisions
before update of summary on public.reports
for each row execute function public.land_guard_working_revisions();

create function public.land_working_guard_version()
returns text language sql stable security invoker set search_path = pg_catalog as $$
  select '1'::text
$$;
revoke all on function public.land_guard_working_revisions(),public.land_working_guard_version() from public,anon,authenticated;
grant execute on function public.land_working_guard_version() to service_role;
notify pgrst,'reload schema';
commit;
