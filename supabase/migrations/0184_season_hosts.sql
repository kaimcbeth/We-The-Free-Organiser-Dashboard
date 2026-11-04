-- Hosts for next season (Kai, 5 Nov 2026): "Currently working on our summer
-- calendar, does anyone want to host an event?" Shows 4 weeks before a season
-- starts (due 3 weeks before), so new events make it onto the seasonal
-- calendar (promo_season_calendar, a week before). create_season_tasks now
-- makes both from a small table of steps.

insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, sort_order,
                        anchor, appear_hours, audience, schedule, core_role, default_enabled, late_ok)
values ('com_season_hosts', 'Event hosts asked for next season',
        'You''re putting next season''s calendar together. Ask in the WhatsApp community if anyone would like to host an event (a potluck, hike, workshop, movie night or collab) so it makes the calendar.',
        'Ask who''d like to host an event next season',
        5, 0, 44, 'start', 0, 'community', 'season', 'community_lead', true, false)
on conflict (kind) do nothing;

create or replace function private.create_season_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with steps(kind, show_days, due_days) as (
    values ('com_season_hosts', 28, 21),
           ('promo_season_calendar', 7, 1)
  ), t as (
    select tm.id, coalesce(tm.timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(tm.timezone, 'Australia/Sydney'))::date today
    from teams tm
    where not tm.is_example and not tm.is_practice and tm.connect_waiting_since is null
  ), s as (
    select t.*, st.kind, st.show_days, st.due_days,
           date_trunc('month', t.today + st.show_days)::date start
    from t cross join steps st
  ), due as (
    select s.id team_id, k.kind, 'season-' || to_char(s.start, 'YYYY-MM') period,
           ((s.start - s.due_days)::timestamp + interval '18 hours') at time zone s.tz due_at,
           private.task_assignee(s.id, k.kind, null, s.today) assignee
    from s
    join task_kinds k on k.kind = s.kind and k.archived_at is null
    left join team_task_kinds tk on tk.team_id = s.id and tk.kind = k.kind
    where extract(month from s.start) in (3, 6, 9, 12)
      and s.today >= s.start - s.show_days and s.today < s.start - s.due_days + 1
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
