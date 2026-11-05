-- "Event hosts asked for next season" now shows on the 1st of the month before
-- the season (Kai, 5 Nov 2026: "first of the month before the season starts,
-- like Nov for summer"), still due 3 weeks before the season. The seasonal
-- calendar step is unchanged (a week before). show_days = null means "from the
-- 1st of the month before".

create or replace function private.create_season_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with steps(kind, show_days, due_days) as (
    values ('com_season_hosts', null::int, 21),
           ('promo_season_calendar', 7, 1)
  ), t as (
    select tm.id, coalesce(tm.timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(tm.timezone, 'Australia/Sydney'))::date today
    from teams tm
    where not tm.is_example and not tm.is_practice and tm.connect_waiting_since is null
  ), s as (
    select t.*, st.kind, st.due_days,
           case when st.show_days is null
                then (date_trunc('month', t.today) + interval '1 month')::date
                else date_trunc('month', t.today + st.show_days)::date end start,
           st.show_days
    from t cross join steps st
  ), due as (
    select s.id team_id, k.kind, 'season-' || to_char(s.start, 'YYYY-MM') period,
           ((s.start - s.due_days)::timestamp + interval '18 hours') at time zone s.tz due_at,
           private.task_assignee(s.id, k.kind, null, s.today) assignee
    from s
    join task_kinds k on k.kind = s.kind and k.archived_at is null
    left join team_task_kinds tk on tk.team_id = s.id and tk.kind = k.kind
    where extract(month from s.start) in (3, 6, 9, 12)
      and s.today >= case when s.show_days is null
                          then (s.start - interval '1 month')::date
                          else s.start - s.show_days end
      and s.today < s.start - s.due_days + 1
      and (coalesce(tk.enabled, k.default_enabled) or private.has_owner(s.id, k.kind))
  ), made as (
    insert into tasks (team_id, kind, period, due_at, assigned_to)
    select team_id, kind, period, due_at, assignee from due
    on conflict (team_id, kind, period) where period is not null do nothing
    returning id, kind, assigned_to
  ), notified as (
    insert into notifications (user_id, kind, title, body, url, task_id)
    select p.user_id, 'task', k.title, 'A new action for you.', '/me#tasks', m.id
    from made m
    join task_kinds k on k.kind = m.kind
    join people p on p.id = m.assigned_to and p.user_id is not null
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end $$;
