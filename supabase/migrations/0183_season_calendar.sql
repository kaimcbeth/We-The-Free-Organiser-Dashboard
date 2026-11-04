-- Seasonal calendar (Kai, 5 Nov 2026): a week before each season starts
-- (1 Dec, 1 Mar, 1 Jun, 1 Sep), an action to post the season's events as one
-- graphic. The graphic (season-calendar.tsx) keeps to a handful of events,
-- special events first, then trainings, collabs and new one-offs.

alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check check (schedule = any (array[
  'event', 'weekly', 'monthly', 'quarterly', 'newcomer', 'month_end', 'follow_up', 'special', 'weather', 'birthday', 'pod', 'season']));

insert into task_kinds (kind, title, description, blurb, estimate_minutes, estimate_max_minutes, due_after_hours, sort_order,
                        anchor, appear_hours, audience, schedule, core_role, default_enabled, late_ok)
values ('promo_season_calendar', 'Seasonal calendar posted',
        'A new season starts next week. Post one graphic with the highlights coming up (special events, trainings, collabs and anything new) on Instagram, Facebook and in the WhatsApp community, so people can save the dates.',
        'Post the season''s events as one calendar graphic',
        10, 15, 0, 3, 'start', 0, 'community', 'season', 'promo_lead', true, false)
on conflict (kind) do nothing;

-- From 7 days before a season starts until it starts (team's own time).
create or replace function private.create_season_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with t as (
    select tm.id, coalesce(tm.timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(tm.timezone, 'Australia/Sydney'))::date today
    from teams tm
    where not tm.is_example and not tm.is_practice and tm.connect_waiting_since is null
  ), s as (
    select t.*, (date_trunc('month', t.today + 7)::date) start
    from t
  ), due as (
    select s.id team_id, k.kind, 'season-' || to_char(s.start, 'YYYY-MM') period,
           ((s.start - 1)::timestamp + interval '18 hours') at time zone s.tz due_at,
           private.task_assignee(s.id, k.kind, null, s.today) assignee
    from s
    join task_kinds k on k.kind = 'promo_season_calendar' and k.archived_at is null
    left join team_task_kinds tk on tk.team_id = s.id and tk.kind = k.kind
    where extract(month from s.start) in (3, 6, 9, 12)
      and s.today >= s.start - 7 and s.today < s.start
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
revoke all on function private.create_season_tasks() from public, anon;
select cron.schedule('season-tasks', '17 * * * *', $$select private.create_season_tasks()$$);
