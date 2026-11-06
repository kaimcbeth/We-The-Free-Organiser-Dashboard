-- RSLs add their own actions (Kai, 6 Nov 2026: "Give option to add custom
-- task", in Plan RSL actions). Each is one of:
--   community: one per community each month (like the organiser check-ins)
--   weekly / monthly: one for the whole region (tasks.region_id)

alter table task_kinds add column if not exists region_id uuid references regions(id) on delete cascade;
alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check check (schedule = any (array[
  'event','weekly','fortnightly','monthly','quarterly','newcomer','month_end','follow_up',
  'special','weather','birthday','pod','season','region_weekly','region_monthly']));

-- A team belongs to a region's patch: in the region, or in one of its extra
-- countries (0202: Oceania covers Japan).
create or replace function private.team_in_region(p_team uuid, p_region uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from teams t, regions r
    where t.id = p_team and r.id = p_region
      and (t.region_id = r.id or private.team_country(t.name) = any(r.extra_countries))
  );
$$;

create or replace function public.add_region_task(
  p_region uuid, p_title text, p_minutes int, p_how text)
returns text language plpgsql security definer set search_path = public as $$
declare v_kind text := 'rsl_' || replace(gen_random_uuid()::text, '-', '');
begin
  if not private.can_plan_region(p_region) then return null; end if;
  if coalesce(trim(p_title), '') = '' or p_how not in ('community', 'weekly', 'monthly') then
    return null;
  end if;
  insert into task_kinds (kind, title, estimate_minutes, anchor, appear_hours, due_after_hours,
                          sort_order, audience, schedule, default_enabled, region_id, created_by)
  values (v_kind, left(trim(p_title), 80), greatest(1, least(coalesce(p_minutes, 10), 600)),
          'start', 0, 0, 50, 'regional',
          case p_how when 'community' then 'monthly' when 'weekly' then 'region_weekly' else 'region_monthly' end,
          true, p_region, auth.uid());
  insert into region_task_kinds (region_id, kind, enabled) values (p_region, v_kind, true);
  perform private.create_region_tasks();
  perform private.create_monthly_tasks();
  return v_kind;
end $$;

create or replace function public.remove_region_task(p_kind text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_region uuid;
begin
  select region_id into v_region from task_kinds where kind = p_kind and region_id is not null;
  if v_region is null or not private.can_plan_region(v_region) then return false; end if;
  update task_kinds set archived_at = now() where kind = p_kind;
  update tasks set dismissed_at = now()
  where kind = p_kind and done_at is null and dismissed_at is null;
  return true;
end $$;
grant execute on function public.add_region_task(uuid, text, int, text) to authenticated;
grant execute on function public.remove_region_task(text) to authenticated;

-- Region-wide weekly/monthly actions, for the region's RSL.
create or replace function private.create_region_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with r as (
    select g.id, coalesce((select t.timezone from teams t where t.region_id = g.id
                           group by 1 order by count(*) desc limit 1), 'Australia/Sydney') tz
    from regions g
  ), d as (
    select r.id, r.tz, (now() at time zone r.tz)::date today from r
  ), due as (
    select d.id region_id, k.kind,
           case when k.schedule = 'region_weekly' then to_char(d.today, 'IYYY-"W"IW')
                else to_char(d.today, 'YYYY-MM') end period,
           case when k.schedule = 'region_weekly' then
             greatest(((d.today - extract(isodow from d.today)::int + 7)::timestamp
                       + interval '23 hours 59 minutes') at time zone d.tz, now() + interval '1 day')
           else
             greatest(((to_char(d.today, 'YYYY-MM') || '-15 23:59')::timestamp at time zone d.tz),
                      now() + interval '3 days')
           end due_at
    from d join task_kinds k on k.region_id = d.id and k.audience = 'regional'
                             and k.archived_at is null
                             and k.schedule in ('region_weekly', 'region_monthly')
    where coalesce((select rk.enabled from region_task_kinds rk
                    where rk.region_id = d.id and rk.kind = k.kind), k.default_enabled)
  ), made as (
    insert into tasks (region_id, kind, period, due_at)
    select region_id, kind, period, due_at from due
    on conflict (region_id, kind, period) where region_id is not null and period is not null do nothing
    returning id, region_id, kind
  ), notified as (
    insert into notifications (user_id, kind, title, body, url, task_id)
    select o.id, 'task', k.title, 'A new action for you.', '/tasks', m.id
    from made m join task_kinds k on k.kind = m.kind
    join organisers o on (o.access = 'regional_lead' and o.region_id = m.region_id)
                      or (o.access = 'god' and o.lead_region_id = m.region_id)
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end $$;

select cron.schedule('region-tasks', '27 * * * *', 'select private.create_region_tasks()');

-- Per-community RSL actions: a region's own ones only for its teams, and
-- each one's on/off is the owning region's.
do $$
declare v text;
begin
  select pg_get_functiondef('private.create_monthly_tasks()'::regprocedure) into v;
  if position('team_in_region' in v) = 0 then
    v := replace(v,
      E'and k.schedule <> ''special''\n    where t.connect_waiting_since is null',
      E'and k.schedule not in (''special'', ''region_weekly'', ''region_monthly'')\n                             and (k.region_id is null or private.team_in_region(t.id, k.region_id))\n    where t.connect_waiting_since is null');
    v := replace(v,
      'rk.region_id = t.region_id and rk.kind = k.kind',
      'rk.region_id = coalesce(k.region_id, t.region_id) and rk.kind = k.kind');
    if position('team_in_region' in v) = 0 or position('coalesce(k.region_id, t.region_id)' in v) = 0 then
      raise exception 'create_monthly_tasks patch did not apply';
    end if;
    execute v;
  end if;
end $$;

-- Saving a plan only touches this region's own actions and teams (incl.
-- extra countries).
create or replace function public.set_region_action_plan(
  p_region uuid, p_on text[], p_minutes int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.can_plan_region(p_region) then
    raise exception 'not allowed';
  end if;
  insert into region_task_kinds (region_id, kind, enabled)
  select p_region, k.kind, k.kind = any(p_on)
  from task_kinds k
  where k.audience = 'regional' and k.archived_at is null and k.team_id is null
    and (k.region_id is null or k.region_id = p_region)
  on conflict (region_id, kind) do update set enabled = excluded.enabled;
  update regions set rsl_week_minutes = p_minutes where id = p_region;
  update tasks t set dismissed_at = now()
  from task_kinds k
  where k.kind = t.kind and k.audience = 'regional' and not (k.kind = any(p_on))
    and (k.region_id is null or k.region_id = p_region)
    and t.done_at is null and t.dismissed_at is null
    and (t.region_id = p_region
         or t.team_id in (select id from teams where private.team_in_region(id, p_region)));
end $$;

-- The planner's community count includes extra countries (Japan for Oceania).
create or replace function public.region_action_plan(p_region uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not private.can_plan_region(p_region) then
    raise exception 'not allowed';
  end if;
  return jsonb_build_object(
    'minutes', (select rsl_week_minutes from regions where id = p_region),
    'communities', (select count(*) from teams t where private.team_in_region(t.id, p_region)
                      and not coalesce(t.is_example, false)
                      and not coalesce(t.is_practice, false)),
    'enabled', coalesce((select jsonb_object_agg(kind, enabled)
                         from region_task_kinds where region_id = p_region), '{}'::jsonb)
  );
end $$;
