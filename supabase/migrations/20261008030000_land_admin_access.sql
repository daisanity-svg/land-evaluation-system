-- Non-destructive management migration. Execute before enabling LAND_ACCESS_CONTROL.
begin;
set local lock_timeout='5s';
create table if not exists public.land_members (
 email text primary key check(email=lower(email)), user_id uuid unique references auth.users(id),
 display_name text not null default '', role text not null default 'member' check(role in ('admin','member')),
 status text not null default 'active' check(status in ('active','disabled')),
 mcp_status text not null default 'not_connected' check(mcp_status in ('not_connected','confirmed','revoked')),
 created_at timestamptz not null default now()
);
create table if not exists public.land_cases (
 report_id text primary key, client text not null, land_number text not null, research_date text not null,
 owner_id uuid references auth.users(id), status text not null default 'draft' check(status in ('draft','researching','preliminary','complete','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.land_case_shares (
 report_id text references public.land_cases(report_id) on delete cascade,
 member_id uuid references auth.users(id), permission text not null check(permission in ('view','edit')),
 primary key(report_id,member_id)
);
create table if not exists public.land_handoffs (
 token_hash text primary key check(length(token_hash)=64), report_id text not null references public.land_cases(report_id),
 issued_by uuid not null references auth.users(id), expires_at timestamptz not null, used_at timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.land_audit_log (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id), action text not null,
 report_id text, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.land_login_limits (
 bucket text primary key, hits integer not null default 0, expires_at timestamptz not null
);
create index if not exists land_cases_owner_idx on public.land_cases(owner_id,updated_at desc);
create index if not exists land_shares_member_idx on public.land_case_shares(member_id);
create index if not exists land_audit_date_idx on public.land_audit_log(created_at desc);
create index if not exists land_handoffs_case_idx on public.land_handoffs(report_id);
-- Import existing case metadata only; report content stays intact. Legacy cases remain administrator-only until assigned.
insert into public.land_cases(report_id,client,land_number,research_date,status,created_at,updated_at)
select report_id,client,land_number,research_date::text,'preliminary',coalesce(created_at,now()),coalesce(updated_at,now()) from public.reports
on conflict(report_id) do nothing;
alter table public.land_members enable row level security;
alter table public.land_cases enable row level security;
alter table public.land_case_shares enable row level security;
alter table public.land_handoffs enable row level security;
alter table public.land_audit_log enable row level security;
alter table public.land_login_limits enable row level security;
alter table public.reports enable row level security;
revoke all on public.land_members,public.land_cases,public.land_case_shares,public.land_handoffs,public.land_audit_log,public.land_login_limits from anon,authenticated;
grant all on public.land_members,public.land_cases,public.land_case_shares,public.land_handoffs,public.land_audit_log,public.land_login_limits,public.reports to service_role;
grant usage,select on sequence public.land_audit_log_id_seq to service_role;
create or replace function public.land_case_allowed(p_actor uuid,p_report text,p_write boolean default false)
returns boolean language sql security invoker set search_path=public as $$
 select exists(select 1 from land_members m join land_cases c on c.report_id=p_report where m.user_id=p_actor and m.status='active'
 and (m.role='admin' or c.owner_id=p_actor or exists(select 1 from land_case_shares s where s.report_id=p_report and s.member_id=p_actor and (not p_write or s.permission='edit'))))
$$;
create or replace function public.land_issue_handoff(p_actor uuid,p_report text,p_hash text)
returns timestamptz language plpgsql security invoker set search_path=public as $$
declare expiration timestamptz:=now()+interval '8 hours';
begin
 perform 1 from land_cases where report_id=p_report and status<>'archived' for update;
 if not found or not land_case_allowed(p_actor,p_report,true) then raise exception 'case access denied'; end if;
 update land_handoffs set revoked_at=now() where report_id=p_report and used_at is null and revoked_at is null;
 insert into land_handoffs(token_hash,report_id,issued_by,expires_at) values(p_hash,p_report,p_actor,expiration);
 update land_cases set status='researching',updated_at=now() where report_id=p_report;
 insert into land_audit_log(actor_id,action,report_id) values(p_actor,'issue_handoff',p_report);
 return expiration;
end $$;
create or replace function public.land_save_report(p_payload jsonb,p_actor uuid,p_token_hash text,p_status text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare c land_cases; h land_handoffs; existed boolean; status_value text;
begin
 select * into c from land_cases where report_id=p_payload->>'report_id' for update;
 if not found or c.status='archived' or not land_case_allowed(p_actor,c.report_id,true) then raise exception 'case access denied'; end if;
 if c.client<>p_payload->>'client' or c.land_number<>p_payload->>'land_number' or c.research_date<>p_payload->>'research_date' then raise exception 'case identity mismatch'; end if;
 if p_token_hash is not null then
  select * into h from land_handoffs where token_hash=p_token_hash and report_id=c.report_id and issued_by=p_actor for update;
  if not found or h.used_at is not null or h.revoked_at is not null or h.expires_at<=now() then raise exception 'handoff expired or consumed'; end if;
 end if;
 existed:=exists(select 1 from reports where report_id=c.report_id);
 insert into reports(report_id,client,land_number,research_date,summary,report_text)
 values(c.report_id,c.client,c.land_number,c.research_date,p_payload->'summary',p_payload->>'report_text')
 on conflict(report_id) do update set summary=excluded.summary,report_text=excluded.report_text;
 if p_token_hash is not null then update land_handoffs set used_at=now() where token_hash=p_token_hash; end if;
 status_value:=case when p_status='complete' then 'complete' else 'preliminary' end;
 update land_cases set status=status_value,updated_at=now() where report_id=c.report_id;
 insert into land_audit_log(actor_id,action,report_id,detail) values(p_actor,'save_report',c.report_id,jsonb_build_object('status',status_value,'channel',case when p_token_hash is null then 'web' else 'mcp' end));
 return jsonb_build_object('operation',case when existed then 'updated' else 'created' end);
end $$;
create or replace function public.land_rate_limit(p_bucket text,p_max integer)
returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 delete from land_login_limits where expires_at<now();
 insert into land_login_limits(bucket,hits,expires_at) values(p_bucket,1,now()+interval '1 hour')
 on conflict(bucket) do update set hits=land_login_limits.hits+1 returning hits into n;
 return n<=p_max;
end $$;
revoke all on function public.land_case_allowed(uuid,text,boolean), public.land_issue_handoff(uuid,text,text),public.land_save_report(jsonb,uuid,text,text),public.land_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.land_case_allowed(uuid,text,boolean), public.land_issue_handoff(uuid,text,text),public.land_save_report(jsonb,uuid,text,text),public.land_rate_limit(text,integer) to service_role;
create or replace function public.land_admin_member(p_actor uuid,p_email text,p_name text,p_role text,p_status text,p_mcp text)
returns void language plpgsql security invoker set search_path=public as $$
begin
 lock table land_members in share row exclusive mode;
 if not exists(select 1 from land_members where user_id=p_actor and role='admin' and status='active') then raise exception 'administrator required'; end if;
 if p_email<>lower(p_email) or length(p_email)>254 then raise exception 'invalid email'; end if;
 if exists(select 1 from land_members where email=p_email and role='admin' and status='active')
 and (p_role<>'admin' or p_status<>'active') and (select count(*) from land_members where role='admin' and status='active')<=1 then raise exception 'cannot disable last administrator'; end if;
 insert into land_members(email,display_name,role,status,mcp_status) values(p_email,p_name,p_role,p_status,p_mcp)
 on conflict(email) do update set display_name=excluded.display_name,role=excluded.role,status=excluded.status,mcp_status=excluded.mcp_status;
 if p_status='disabled' then update land_handoffs set revoked_at=now() where issued_by=(select user_id from land_members where email=p_email) and used_at is null and revoked_at is null; end if;
 insert into land_audit_log(actor_id,action,detail) values(p_actor,'member_update',jsonb_build_object('email',p_email,'role',p_role,'status',p_status,'mcp_status',p_mcp));
end $$;
create or replace function public.land_admin_case(p_actor uuid,p_report text,p_mode text,p_target uuid,p_permission text)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from land_members where user_id=p_actor and role='admin' and status='active') then raise exception 'administrator required'; end if;
 perform 1 from land_cases where report_id=p_report for update;
 if not found then raise exception 'case missing'; end if;
 if p_mode in ('assign','share','revoke') and not exists(select 1 from land_members where user_id=p_target and status='active') then raise exception 'active target required'; end if;
 if p_mode='assign' then update land_cases set owner_id=p_target,updated_at=now() where report_id=p_report;
 elsif p_mode='share' then insert into land_case_shares(report_id,member_id,permission) values(p_report,p_target,p_permission) on conflict(report_id,member_id) do update set permission=excluded.permission;
 elsif p_mode='revoke' then delete from land_case_shares where report_id=p_report and member_id=p_target;
 elsif p_mode='archive' then update land_cases set status='archived',updated_at=now() where report_id=p_report;
 elsif p_mode='restore' then update land_cases set status='preliminary',updated_at=now() where report_id=p_report;
 else raise exception 'invalid action'; end if;
 update land_handoffs set revoked_at=now() where report_id=p_report and used_at is null and revoked_at is null;
 insert into land_audit_log(actor_id,action,report_id,detail) values(p_actor,p_mode,p_report,jsonb_build_object('target',p_target,'permission',p_permission));
end $$;
revoke all on function public.land_admin_member(uuid,text,text,text,text,text),public.land_admin_case(uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.land_admin_member(uuid,text,text,text,text,text),public.land_admin_case(uuid,text,text,uuid,text) to service_role;
insert into public.land_members(email,display_name,role,status) values('daisanity@icloud.com','戴異軒','admin','active') on conflict(email) do nothing;
notify pgrst,'reload schema';
commit;
-- Bootstrap ONE trusted administrator separately, replacing the placeholder email:
-- insert into public.land_members(email,display_name,role) values('YOUR_VERIFIED_EMAIL','戴異軒','admin');
-- Do not enable the access-control environment flag until owner login and the admin page pass acceptance.
