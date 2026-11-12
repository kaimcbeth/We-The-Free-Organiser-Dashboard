-- Reconnect action (Kai, 12 Nov 2026, idea 8): when a regular goes quiet,
-- one action per person to send them a friendly message.
-- Regular = 3+ check-ins at this community's events. Quiet = last check-in
-- 6 to 17 weeks ago and the community has held 3+ events (with check-ins)
-- since. At most 2 new a day per community and 4 open at once; once per
-- person per 6 months; skipped when they've said Going to something coming up.

alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check check (schedule = any (array[
  'event', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'newcomer', 'month_end', 'follow_up', 'special',
  'weather', 'birthday', 'pod', 'season', 'region_weekly', 'region_fortnightly', 'region_monthly',
  'region_quarterly', 'reconnect']));

insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, sort_order,
                        anchor, appear_hours, audience, schedule, core_role, default_enabled, late_ok, tier, importance)
values ('com_reconnect', 'Reached out to a member we haven''t seen in a while',
        'Send them a friendly message: no pressure, just that they''re missed and what''s coming up. Ask how they''re going.',
        'When a regular stops coming, get an action to send them a friendly message.',
        5, 0, 54, 'end', 0, 'community', 'reconnect', 'community_lead', true, false, 2,
        (select coalesce(max(importance), 0) + 1 from task_kinds))
on conflict (kind) do nothing;

create or replace function private.create_reconnect_tasks()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update tasks set dismissed_at = now()
   where kind = 'com_reconnect' and done_at is null and dismissed_at is null
     and due_at < now() - interval '7 days';

  if (select k.archived_at from task_kinds k where k.kind = 'com_reconnect') is not null then
    return 0;
  end if;

  with local as (
    select t.id team_id, coalesce(t.timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(t.timezone, 'Australia/Sydney')) lt
    from teams t
    left join team_task_kinds s on s.team_id = t.id and s.kind = 'com_reconnect'
    where not t.is_example and not t.is_practice and coalesce(s.enabled, true)
  ), att as (
    select a.person_id, e.team_id, count(*) n, max(e.starts_at) last_at
    from attendance a join events e on e.id = a.event_id
    group by a.person_id, e.team_id
  ), held as (
    select e.team_id, e.starts_at from events e
    where exists (select 1 from attendance a where a.event_id = e.id)
  ), cand as (
    select p.id person_id, p.first_name, l.team_id, l.tz, l.lt, x.n, x.last_at,
           row_number() over (partition by l.team_id order by x.n desc, x.last_at desc) rn
    from people p
    join local l on l.team_id = p.team_id
    join att x on x.person_id = p.id and x.team_id = p.team_id
    where not p.is_test
      and extract(hour from l.lt) >= 9
      and x.n >= 3
      and x.last_at < now() - interval '42 days'
      and x.last_at > now() - interval '120 days'
      and (select count(*) from held h where h.team_id = l.team_id and h.starts_at > x.last_at and h.starts_at < now()) >= 3
      and not exists (select 1 from tasks k where k.kind = 'com_reconnect' and k.person_id = p.id
                      and k.created_at > now() - interval '180 days')
      and not exists (select 1 from event_rsvps r join events e on e.id = r.event_id
                      where r.person_id = p.id and r.status = 'going' and e.starts_at > now())
      and not exists (select 1 from tasks k where k.kind = 'com_reconnect' and k.team_id = l.team_id
                      and k.created_at > now() - interval '20 hours')
  ), due as (
    select c.*, private.task_assignee(c.team_id, 'com_reconnect', null, c.lt::date) assignee
    from cand c
    where c.rn <= 2
      and (select count(*) from tasks k where k.kind = 'com_reconnect' and k.team_id = c.team_id
           and k.done_at is null and k.dismissed_at is null) + c.rn <= 4
  ), made as (
    insert into tasks (team_id, kind, person_id, period, due_at, assigned_to, note)
    select team_id, 'com_reconnect', person_id, 'reconnect-' || person_id || '-' || (last_at at time zone tz)::date,
           ((lt::date + 8)::timestamp at time zone tz) - interval '1 minute', assignee,
           first_name || ' came ' || n || ' times, last on '
             || trim(to_char(last_at at time zone tz, 'FMDD FMMonth')) || '.'
    from due
    on conflict (team_id, kind, period) where period is not null do nothing
    returning id, team_id, person_id, assigned_to
  ), notified as (
    insert into notifications (user_id, kind, title, body, url, task_id)
    select coalesce(a.user_id, o.id), 'task', 'Reach out to ' || p.first_name,
           'We haven''t seen ' || p.first_name || ' in a while. Send them a friendly message.',
           case when a.user_id is not null then '/me#tasks' else '/tasks' end, m.id
    from made m
    join people p on p.id = m.person_id
    left join people a on a.id = m.assigned_to
    left join organisers o on m.assigned_to is null
      and ((o.access = 'organiser' and o.team_id = m.team_id)
           or (o.access = 'god' and o.organiser_team_id = m.team_id))
    where coalesce(a.user_id, o.id) is not null
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end $$;

select cron.schedule('reconnect-tasks', '14 * * * *', $$select private.create_reconnect_tasks()$$);
