-- (Applied as newcomer_and_month_end_actions.) Two new kinds of schedule:
-- 'newcomer' (one action per newcomer, made when they first check in, with
-- tasks.person_id set) and 'month_end' (last 3 days of the month, gone 3 days
-- into the next). Onboarding and "Paired with a regular" become per-newcomer
-- (the latter ticks itself off once a supporter is connected); the monthly
-- recap becomes month-end. Made by private.create_extra_tasks() every 10 min.
alter table tasks add column person_id uuid references people (id) on delete cascade;
alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check
  check (schedule in ('event', 'weekly', 'monthly', 'quarterly', 'newcomer', 'month_end'));

update task_kinds set schedule = 'newcomer', schedule_weekday = null, due_after_hours = 72,
  title = 'Onboarding sent',
  blurb = 'Send a newcomer the welcome info',
  description = 'This newcomer has the welcome info: what we do, how to join the WhatsApp community, and what''s coming up.'
where kind = 'com_onboarding';
update task_kinds set schedule = 'newcomer', schedule_weekday = null, due_after_hours = 72,
  title = 'Paired with a regular',
  blurb = 'Connect a regular to help a newcomer feel welcome',
  description = 'Connect a regular volunteer to help this newcomer feel welcome. Open their profile and pick someone under New member support; they''ll check in before the next event. Ticks itself off once someone is connected.'
where kind = 'com_buddies';
update task_kinds set schedule = 'month_end', schedule_day = null, due_after_hours = 0,
  description = 'A recap of this month''s events (photos and highlights) is posted on Facebook and Instagram. Shows up in the last 3 days of the month.'
where kind = 'promo_monthly_recap';
update tasks set dismissed_at = now()
where kind in ('com_onboarding', 'com_buddies', 'promo_monthly_recap') and done_at is null and dismissed_at is null;

create or replace function private.create_extra_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int := 0; n int;
begin
  with firsts as (
    select p.id person_id, p.team_id, min(e.starts_at) first_at
    from people p
    join attendance a on a.person_id = p.id
    join events e on e.id = a.event_id
    where not p.is_test and not p.attended_before_app
    group by p.id, p.team_id
    having min(e.starts_at) > now() - interval '7 days' and count(*) = 1
  ), made as (
    insert into tasks (team_id, kind, period, person_id, due_at, assigned_to)
    select f.team_id, k.kind, 'person:' || f.person_id, f.person_id,
           greatest(f.first_at + make_interval(hours => k.due_after_hours), now() + interval '1 day'),
           private.task_assignee(f.team_id, k.kind, null, current_date)
    from firsts f
    join task_kinds k on k.schedule = 'newcomer' and k.archived_at is null and k.audience = 'community'
                     and (k.team_id is null or k.team_id = f.team_id)
    left join team_task_kinds s on s.team_id = f.team_id and s.kind = k.kind
    where (coalesce(s.enabled, k.default_enabled) or private.has_owner(f.team_id, k.kind))
      and not (k.kind = 'com_buddies' and exists (
        select 1 from buddy_pairings b where b.newcomer_id = f.person_id and b.ended_at is null))
    on conflict (team_id, kind, period) where period is not null do nothing
    returning 1
  ) select count(*) into n from made;
  v_count := v_count + n;

  update tasks t set done_at = now()
  where t.kind = 'com_buddies' and t.done_at is null and t.dismissed_at is null and t.person_id is not null
    and exists (select 1 from buddy_pairings b where b.newcomer_id = t.person_id and b.ended_at is null);

  with t as (
    select id, coalesce(timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(timezone, 'Australia/Sydney'))::date today
    from teams
  ), made as (
    insert into tasks (team_id, kind, period, due_at, assigned_to)
    select t.id, k.kind, to_char(t.today, 'YYYY-MM') || '-end',
           ((date_trunc('month', t.today) + interval '1 month' + interval '3 days')::date::timestamp - interval '1 minute') at time zone t.tz,
           private.task_assignee(t.id, k.kind, null, t.today)
    from t join task_kinds k on k.schedule = 'month_end' and k.archived_at is null and k.audience = 'community'
                             and (k.team_id is null or k.team_id = t.id)
    left join team_task_kinds s on s.team_id = t.id and s.kind = k.kind
    where t.today >= (date_trunc('month', t.today) + interval '1 month' - interval '3 days')::date
      and (coalesce(s.enabled, k.default_enabled) or private.has_owner(t.id, k.kind))
    on conflict (team_id, kind, period) where period is not null do nothing
    returning 1
  ) select count(*) into n from made;
  v_count := v_count + n;

  update tasks t set dismissed_at = now()
  from task_kinds k
  where k.kind = t.kind and k.schedule = 'month_end'
    and t.done_at is null and t.dismissed_at is null and t.due_at < now();
  return v_count;
end $$;

select cron.schedule('extra-tasks', '*/10 * * * *', 'select private.create_extra_tasks()');
