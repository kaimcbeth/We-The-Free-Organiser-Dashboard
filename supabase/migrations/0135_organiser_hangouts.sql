-- Organiser Hangouts (activism.wtf/hangouts/...). The import-hangouts Edge
-- Function finds them in the site's sitemap every hour and saves them here.
-- Organisers in the communities a hangout is for see it on Events and the
-- calendar as a listing only (no attendance, no actions). Regional Support
-- Leads of those communities' regions get a weekly "promote it" action from
-- 3 weeks before.

create table if not exists public.hangouts (
  id uuid primary key default gen_random_uuid(),
  source_url text not null unique,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  audience text,                       -- "Oceania + Japan" (from "For organizers in ...")
  host text,
  team_ids uuid[] not null default '{}',
  region_ids uuid[] not null default '{}',
  removed_at timestamptz,              -- gone from activism.wtf before it happened
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hangouts enable row level security;
create policy "god reads hangouts" on public.hangouts for select
  to authenticated using (private.is_god());

-- Which communities an audience means. Each part ("Oceania", "Japan", "UK")
-- is a region name or a country at the end of community names.
create or replace function private.hangout_audience(p_audience text, out team_ids uuid[], out region_ids uuid[])
language sql stable security definer set search_path = public as $$
  with parts as (
    select lower(trim(p)) p
    from regexp_split_to_table(coalesce(p_audience, ''), '\s*(?:\+|,|&|/|\yand\y)\s*') p
    where trim(p) <> ''
  ), named as (
    select p, case p when 'united kingdom' then 'uk' when 'england' then 'uk'
                     when 'us' then 'usa' when 'united states' then 'usa' else p end as country
    from parts
  ), direct_regions as (
    select r.id from regions r join named n on lower(r.name) = n.p
  ), teams_in as (
    select distinct t.id, t.region_id from teams t
    join regions r on r.id = t.region_id
    join named n on lower(r.name) = n.p or lower(t.name) like '%, ' || n.country
  )
  select coalesce((select array_agg(id) from teams_in), '{}'),
         coalesce((select array_agg(distinct x) from (
           select id x from direct_regions union select region_id from teams_in) s), '{}');
$$;
revoke execute on function private.hangout_audience(text) from public, anon, authenticated;

create or replace function private.set_hangout_audience()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select a.team_ids, a.region_ids into new.team_ids, new.region_ids
  from private.hangout_audience(new.audience) a;
  return new;
end $$;
drop trigger if exists hangouts_audience on public.hangouts;
create trigger hangouts_audience before insert or update of audience on public.hangouts
  for each row execute function private.set_hangout_audience();

-- Hangouts for one community (organisers, their Regional Support Lead, God).
create or replace function public.team_hangouts(p_team_id uuid, p_from timestamptz, p_to timestamptz)
returns table (id uuid, title text, starts_at timestamptz, ends_at timestamptz,
               audience text, host text, url text)
language sql stable security definer set search_path = public as $$
  select h.id, h.title, h.starts_at, h.ends_at, h.audience, h.host, h.source_url
  from hangouts h
  where private.is_team_organiser(p_team_id)
    and p_team_id = any (h.team_ids)
    and h.removed_at is null
    and coalesce(h.ends_at, h.starts_at) >= p_from and h.starts_at < p_to
  order by h.starts_at;
$$;
revoke execute on function public.team_hangouts(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.team_hangouts(uuid, timestamptz, timestamptz) to authenticated;

-- Region-wide actions (not tied to one community): tasks.region_id.
alter table public.tasks alter column team_id drop not null;
alter table public.tasks add column if not exists region_id uuid references regions(id) on delete cascade;
alter table public.tasks add column if not exists hangout_id uuid references hangouts(id) on delete cascade;
alter table public.tasks drop constraint if exists tasks_team_or_region;
alter table public.tasks add constraint tasks_team_or_region check (team_id is not null or region_id is not null);
create unique index if not exists tasks_region_kind_period on public.tasks (region_id, kind, period)
  where region_id is not null and period is not null;

create or replace function private.is_region_lead(p_region_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organisers o where o.id = auth.uid()
    and (o.access = 'god' or (o.access = 'regional_lead' and o.region_id = p_region_id)));
$$;
revoke execute on function private.is_region_lead(uuid) from public, anon;
grant execute on function private.is_region_lead(uuid) to authenticated;

drop policy if exists "regional leads manage region tasks" on public.tasks;
create policy "regional leads manage region tasks" on public.tasks for all to authenticated
  using (region_id is not null and private.is_region_lead(region_id))
  with check (region_id is not null and private.is_region_lead(region_id));

create or replace function public.complete_my_task(p_task_id uuid, p_done boolean default true)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update tasks set
    done_at = case when p_done then coalesce(done_at, now()) else null end,
    done_by = case when p_done then auth.uid() else null end
  where id = p_task_id
    and (private.is_my_person(assigned_to) or private.is_team_organiser(team_id)
         or (region_id is not null and private.is_region_lead(region_id)));
  return found;
end $$;

create or replace function public.move_task(p_task_id uuid, p_show_from timestamptz, p_due_at timestamptz)
returns text language plpgsql security definer set search_path = public as $$
begin
  if p_due_at < p_show_from then return 'bad_dates'; end if;
  update tasks set show_from = p_show_from, due_at = p_due_at
   where id = p_task_id and done_at is null
     and (private.is_my_person(assigned_to)
          or (private.is_team_organiser(team_id) and (not private.is_regional_kind(kind) or private.is_regional_staff()))
          or (region_id is not null and private.is_region_lead(region_id)));
  return case when found then 'ok' else 'not_allowed' end;
end $$;

insert into task_kinds (kind, title, description, estimate_minutes, due_after_hours, schedule,
                        sort_order, audience, default_enabled)
values ('promote_hangout', 'Organiser hangout promoted',
        'Remind the organisers in your region about the hangout: a message in the organisers'' chat, or to anyone who hasn''t RSVPed yet.',
        10, 0, 'special', 1, 'regional', false)
on conflict (kind) do update set title = excluded.title, description = excluded.description;

-- Weekly promote actions: 3, 2 and 1 week(s) before. Only this week's one is
-- made (weeks already gone when a hangout first appears are skipped), and a
-- new week's action replaces last week's if it wasn't ticked off.
create or replace function private.create_hangout_tasks()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  with slots as (
    select distinct on (h.id, r.rid) h.id hangout_id, r.rid, w.n, h.starts_at,
           h.starts_at - w.n * interval '7 days' show_from
    from hangouts h
    cross join unnest(h.region_ids) r(rid)
    cross join generate_series(1, 3) w(n)
    where h.removed_at is null and h.starts_at > now()
      and h.starts_at - w.n * interval '7 days' <= now()
    order by h.id, r.rid, w.n
  ), made as (
    insert into tasks (region_id, hangout_id, kind, period, show_from, due_at)
    select rid, hangout_id, 'promote_hangout', 'hangout:' || hangout_id || ':w' || n, show_from,
           least(greatest(show_from + interval '6 days', now() + interval '1 day'), starts_at - interval '1 hour')
    from slots
    on conflict (region_id, kind, period) where region_id is not null and period is not null do nothing
    returning id, region_id, hangout_id
  ), closed as (
    update tasks t set dismissed_at = now()
    from made m
    where t.region_id = m.region_id and t.hangout_id = m.hangout_id and t.id <> m.id
      and t.done_at is null and t.dismissed_at is null
    returning 1
  ), notified as (
    insert into notifications (user_id, kind, title, body, url)
    select o.id, 'task', 'Organiser hangout promoted', 'A new action for you.', '/tasks'
    from made m join organisers o on (o.access = 'regional_lead' and o.region_id = m.region_id)
                                  or (o.access = 'god' and o.lead_region_id = m.region_id)
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end $$;
revoke execute on function private.create_hangout_tasks() from public, anon, authenticated;

-- Region-wide kinds ('special') aren't monthly check-ins.
create or replace function private.create_monthly_tasks()
 returns integer language plpgsql security definer set search_path to 'public' as $function$
declare
  v_count int;
begin
  with t as (
    select id, coalesce(timezone, 'Australia/Sydney') tz, connect_waiting_since,
           (now() at time zone coalesce(timezone, 'Australia/Sydney'))::date today
    from teams
  ), due as (
    -- Regional Support Lead check-ins: one per month, due mid-month, none
    -- while waiting to hear back from the last one.
    select t.id team_id, k.kind, to_char(t.today, 'YYYY-MM') period,
           greatest(((to_char(t.today, 'YYYY-MM') || '-15 23:59')::timestamp at time zone t.tz), now() + interval '3 days') due_at,
           null::uuid assignee
    from t join task_kinds k on k.audience = 'regional' and k.archived_at is null and k.team_id is null
                             and k.schedule <> 'special'
    where t.connect_waiting_since is null
    union all
    select t.id, k.kind, to_char(t.today, 'IYYY-"W"IW'),
           greatest(((t.today - (extract(isodow from t.today)::int - coalesce(k.schedule_weekday, 1)) + 3)::timestamp
             + interval '23 hours 59 minutes') at time zone t.tz, now() + interval '2 days'),
           private.task_assignee(t.id, k.kind, null, t.today)
    from t join task_kinds k on k.schedule = 'weekly' and k.audience = 'community' and k.archived_at is null
                             and (k.team_id is null or k.team_id = t.id)
    left join team_task_kinds s on s.team_id = t.id and s.kind = k.kind
    where extract(isodow from t.today) >= coalesce(k.schedule_weekday, 1)
      and (coalesce(s.enabled, k.default_enabled) or private.has_owner(t.id, k.kind))
    union all
    select t.id, k.kind, to_char(t.today, 'YYYY-MM'),
           greatest(((date_trunc('month', t.today)::date + coalesce(k.schedule_day, 1) - 1 + 7)::timestamp
             + interval '23 hours 59 minutes') at time zone t.tz, now() + interval '2 days'),
           private.task_assignee(t.id, k.kind, null, t.today)
    from t join task_kinds k on k.schedule = 'monthly' and k.audience = 'community' and k.archived_at is null
                             and (k.team_id is null or k.team_id = t.id)
    left join team_task_kinds s on s.team_id = t.id and s.kind = k.kind
    where extract(day from t.today) >= coalesce(k.schedule_day, 1)
      and (coalesce(s.enabled, k.default_enabled) or private.has_owner(t.id, k.kind))
    union all
    select t.id, k.kind, to_char(t.today, 'YYYY-"Q"Q'),
           greatest(((date_trunc('quarter', t.today)::date + 30)::timestamp
             + interval '23 hours 59 minutes') at time zone t.tz, now() + interval '7 days'),
           private.task_assignee(t.id, k.kind, null, t.today)
    from t join task_kinds k on k.schedule = 'quarterly' and k.audience = 'community' and k.archived_at is null
                             and (k.team_id is null or k.team_id = t.id)
    left join team_task_kinds s on s.team_id = t.id and s.kind = k.kind
    where (coalesce(s.enabled, k.default_enabled) or private.has_owner(t.id, k.kind))
  ), made as (
    insert into tasks (team_id, kind, period, due_at, assigned_to)
    select team_id, kind, period, due_at, assignee from due
    on conflict (team_id, kind, period) where period is not null do nothing
    returning id, kind, assigned_to
  ), notified as (
    insert into notifications (user_id, kind, title, body, url)
    select p.user_id, 'task', k.title, 'A new action for you.', '/me#tasks'
    from made m
    join people p on p.id = m.assigned_to and p.user_id is not null
    join task_kinds k on k.kind = m.kind
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end;
$function$;

create or replace function public.resolve_check_in_wait(p_team_id uuid, p_action text)
 returns text language plpgsql security definer set search_path to 'public' as $function$
begin
  if p_action not in ('replied', 'try_again') then return 'bad_action'; end if;
  if not (private.is_regional_staff() and private.is_team_organiser(p_team_id)) then return 'not_allowed'; end if;
  update teams set connect_waiting_since = null where id = p_team_id;
  if p_action = 'try_again' then
    insert into tasks (team_id, kind, period, due_at)
    select p_team_id, k.kind,
           to_char(now(), 'YYYY-MM') || '-again-' || extract(epoch from now())::bigint,
           now() + interval '3 days'
    from task_kinds k where k.audience = 'regional' and k.archived_at is null and k.team_id is null
                        and k.schedule <> 'special';
  end if;
  return 'ok';
end;
$function$;

-- Hourly: import at :37 (Edge Function), promote actions at :42.
select cron.unschedule(jobid) from cron.job where jobname in ('import-hangouts', 'hangout-tasks');
select cron.schedule('import-hangouts', '37 * * * *', $c$
  select net.http_post(
    url := 'https://jmslxbygvmjtwwxuzkrt.supabase.co/functions/v1/import-hangouts',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000)
$c$);
select cron.schedule('hangout-tasks', '42 * * * *', 'select private.create_hangout_tasks()');
