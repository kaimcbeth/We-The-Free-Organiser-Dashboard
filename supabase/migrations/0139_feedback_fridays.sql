-- Monthly actions on the nth weekday of the month (e.g. 3rd Friday):
-- task_kinds.schedule_week (1-4, 5 = last) with schedule_weekday (ISO, 1 =
-- Monday). A community can pick its own week and day (team_task_kinds).
-- Feedback Fridays: "Volunteer feedback collected" becomes monthly, on by
-- default, on the 3rd Friday.

alter table public.task_kinds add column if not exists schedule_week int check (schedule_week between 1 and 5);
alter table public.team_task_kinds add column if not exists schedule_week int check (schedule_week between 1 and 5);
alter table public.team_task_kinds add column if not exists schedule_weekday int check (schedule_weekday between 1 and 7);

-- The nth (5 = last) given weekday of the month that p_day is in.
create or replace function private.nth_weekday(p_day date, p_week int, p_isodow int)
returns date language sql immutable set search_path = public as $$
  select case when p_week >= 5 then
      (date_trunc('month', p_day) + interval '1 month - 1 day')::date
        - ((extract(isodow from (date_trunc('month', p_day) + interval '1 month - 1 day'))::int - p_isodow + 7) % 7)
    else
      date_trunc('month', p_day)::date
        + ((p_isodow - extract(isodow from date_trunc('month', p_day))::int + 7) % 7)
        + (p_week - 1) * 7
    end;
$$;

update task_kinds set schedule = 'monthly', schedule_week = 3, schedule_weekday = 5, schedule_day = null,
  default_enabled = true, title = 'Feedback Friday: form shared',
  blurb = 'Share the quick feedback form',
  description = 'Feedback Fridays: share the quick volunteer feedback form in your community chat.'
where kind = 'com_feedback';

-- A community's own week and day for an nth-weekday action.
create or replace function public.set_task_schedule(p_team_id uuid, p_kind text, p_week int, p_weekday int)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then return 'not allowed'; end if;
  if p_week not between 1 and 5 or p_weekday not between 1 and 7 then return 'bad'; end if;
  insert into team_task_kinds (team_id, kind, enabled, schedule_week, schedule_weekday, updated_at, updated_by)
  values (p_team_id, p_kind,
          coalesce((select default_enabled from task_kinds where kind = p_kind), true),
          p_week, p_weekday, now(), auth.uid())
  on conflict (team_id, kind) do update
    set schedule_week = excluded.schedule_week, schedule_weekday = excluded.schedule_weekday,
        updated_at = now(), updated_by = auth.uid();
  -- This month's not-yet-done one moves to the new day (if it's still ahead).
  update tasks t set
    show_from = (private.nth_weekday(t.created_at::date, p_week, p_weekday)::timestamp
                  at time zone coalesce((select timezone from teams where id = p_team_id), 'Australia/Sydney')),
    due_at = ((private.nth_weekday(t.created_at::date, p_week, p_weekday) + 2)::timestamp + interval '23 hours 59 minutes')
                  at time zone coalesce((select timezone from teams where id = p_team_id), 'Australia/Sydney')
  where t.team_id = p_team_id and t.kind = p_kind and t.done_at is null and t.dismissed_at is null
    and private.nth_weekday(t.created_at::date, p_week, p_weekday) >= current_date;
  return 'ok';
end $$;
revoke execute on function public.set_task_schedule(uuid, text, int, int) from public, anon;
grant execute on function public.set_task_schedule(uuid, text, int, int) to authenticated;

-- Monthly actions: on schedule_day, or on the nth weekday (made that day,
-- due 2 days later).
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
    select t.id team_id, k.kind, to_char(t.today, 'YYYY-MM') period,
           greatest(((to_char(t.today, 'YYYY-MM') || '-15 23:59')::timestamp at time zone t.tz), now() + interval '3 days') due_at,
           null::timestamptz show_from,
           null::uuid assignee
    from t join task_kinds k on k.audience = 'regional' and k.archived_at is null and k.team_id is null
                             and k.schedule <> 'special'
    where t.connect_waiting_since is null
    union all
    select t.id, k.kind, to_char(t.today, 'IYYY-"W"IW'),
           greatest(((t.today - (extract(isodow from t.today)::int - coalesce(k.schedule_weekday, 1)) + 3)::timestamp
             + interval '23 hours 59 minutes') at time zone t.tz, now() + interval '2 days'),
           null,
           private.task_assignee(t.id, k.kind, null, t.today)
    from t join task_kinds k on k.schedule = 'weekly' and k.audience = 'community' and k.archived_at is null
                             and (k.team_id is null or k.team_id = t.id)
    left join team_task_kinds s on s.team_id = t.id and s.kind = k.kind
    where extract(isodow from t.today) >= coalesce(k.schedule_weekday, 1)
      and (coalesce(s.enabled, k.default_enabled) or private.has_owner(t.id, k.kind))
    union all
    select t.id, k.kind, to_char(t.today, 'YYYY-MM'),
           case when coalesce(s.schedule_week, k.schedule_week) is not null then
             greatest(((private.nth_weekday(t.today, coalesce(s.schedule_week, k.schedule_week), coalesce(s.schedule_weekday, k.schedule_weekday, 5)) + 2)::timestamp
               + interval '23 hours 59 minutes') at time zone t.tz, now() + interval '1 day')
           else
             greatest(((date_trunc('month', t.today)::date + coalesce(k.schedule_day, 1) - 1 + 7)::timestamp
               + interval '23 hours 59 minutes') at time zone t.tz, now() + interval '2 days')
           end,
           null,
           private.task_assignee(t.id, k.kind, null, t.today)
    from t join task_kinds k on k.schedule = 'monthly' and k.audience = 'community' and k.archived_at is null
                             and (k.team_id is null or k.team_id = t.id)
    left join team_task_kinds s on s.team_id = t.id and s.kind = k.kind
    where (case when coalesce(s.schedule_week, k.schedule_week) is not null
                -- (from the day, for a week: a month already well past is skipped)
                then t.today between private.nth_weekday(t.today, coalesce(s.schedule_week, k.schedule_week), coalesce(s.schedule_weekday, k.schedule_weekday, 5))
                                 and private.nth_weekday(t.today, coalesce(s.schedule_week, k.schedule_week), coalesce(s.schedule_weekday, k.schedule_weekday, 5)) + 7
                else extract(day from t.today) >= coalesce(k.schedule_day, 1) end)
      and (coalesce(s.enabled, k.default_enabled) or private.has_owner(t.id, k.kind))
    union all
    select t.id, k.kind, to_char(t.today, 'YYYY-"Q"Q'),
           greatest(((date_trunc('quarter', t.today)::date + 30)::timestamp
             + interval '23 hours 59 minutes') at time zone t.tz, now() + interval '7 days'),
           null,
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
