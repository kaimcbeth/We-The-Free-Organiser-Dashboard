-- Month-end actions (Kai, 26 Nov 2026):
--  * Monthly recap: comes up once the community's last event of the month has
--    finished (end = ends_at, else start + 3 h); with no events that month,
--    5 days before the month ends as before.
--  * Month calendar: 3 days before the month ends.
-- Both still go away 5 days into the next month.
-- Pairing with a regular: on the Monday after the newcomer's week.
CREATE OR REPLACE FUNCTION private.create_extra_tasks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_count int := 0; n int;
begin
  -- A newcomer's first check-in, not someone who came before the app.
  -- Pairing with a regular (com_buddies) comes up on the Monday after the
  -- newcomer's week (Kai, 26 Nov 2026: "Do pairing with regulars on Mondays"),
  -- due that Monday night; the other newcomer actions straight away.
  with firsts as (
    select p.id person_id, p.team_id, min(e.starts_at) first_at,
           coalesce(tm.timezone, 'Australia/Sydney') tz
    from people p
    join teams tm on tm.id = p.team_id
    join attendance a on a.person_id = p.id
    join events e on e.id = a.event_id
    where not p.is_test and not p.attended_before_app
    group by p.id, p.team_id, tm.timezone
    having min(e.starts_at) > now() - interval '15 days' and count(*) = 1
  ), f as (
    select firsts.*,
           (date_trunc('week', (first_at at time zone tz)::date) + interval '7 days')::date monday,
           (now() at time zone tz)::date today
    from firsts
  ), made as (
    insert into tasks (team_id, kind, period, person_id, due_at, assigned_to)
    select f.team_id, k.kind, 'person:' || f.person_id, f.person_id,
           case when k.kind = 'com_buddies'
                then ((f.monday + interval '1 day')::timestamp - interval '1 minute') at time zone f.tz
                else greatest(f.first_at + make_interval(hours => k.due_after_hours), now() + interval '1 day') end,
           private.task_assignee(f.team_id, k.kind, null, current_date)
    from f
    join task_kinds k on k.schedule = 'newcomer' and k.archived_at is null and k.audience = 'community'
                     and (k.team_id is null or k.team_id = f.team_id)
    left join team_task_kinds s on s.team_id = f.team_id and s.kind = k.kind
    where (coalesce(s.enabled, k.default_enabled) or private.has_owner(f.team_id, k.kind))
      and case when k.kind = 'com_buddies'
               then f.today >= f.monday and f.today < f.monday + 7
               else f.first_at > now() - interval '7 days' end
      and not (k.kind = 'com_buddies' and exists (
        select 1 from buddy_pairings b where b.newcomer_id = f.person_id and b.ended_at is null))
    on conflict (team_id, kind, period) where period is not null do nothing
    returning 1
  ) select count(*) into n from made;
  v_count := v_count + n;

  -- Paired up on their profile: tick it off.
  update tasks t set done_at = now()
  where t.kind = 'com_buddies' and t.done_at is null and t.dismissed_at is null and t.person_id is not null
    and exists (select 1 from buddy_pairings b where b.newcomer_id = t.person_id and b.ended_at is null);

  -- End of month: 5 days before the month ends; the month calendar 3 days
  -- before. The monthly recap has its own rule below.
  with t as (
    select id, coalesce(timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(timezone, 'Australia/Sydney'))::date today
    from teams
  ), made as (
    insert into tasks (team_id, kind, period, due_at, assigned_to)
    select t.id, k.kind, to_char(t.today, 'YYYY-MM') || '-end',
           ((date_trunc('month', t.today) + interval '1 month' + interval '5 days')::date::timestamp - interval '1 minute') at time zone t.tz,
           private.task_assignee(t.id, k.kind, null, t.today)
    from t join task_kinds k on k.schedule = 'month_end' and k.archived_at is null and k.audience = 'community'
                             and (k.team_id is null or k.team_id = t.id)
                             and k.kind <> 'promo_monthly_recap'
    left join team_task_kinds s on s.team_id = t.id and s.kind = k.kind
    where t.today >= (date_trunc('month', t.today) + interval '1 month'
                      - case when k.kind = 'promo_month_calendar' then interval '3 days' else interval '5 days' end)::date
      and (coalesce(s.enabled, k.default_enabled) or private.has_owner(t.id, k.kind))
    on conflict (team_id, kind, period) where period is not null do nothing
    returning 1
  ) select count(*) into n from made;
  v_count := v_count + n;

  -- Monthly recap: once the month's last event has finished (this month or
  -- last month, until 5 days into the next one).
  with t as (
    select id, coalesce(timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(timezone, 'Australia/Sydney'))::date today
    from teams
  ), m as (
    select t.id, t.tz, mo::date month_start
    from t, lateral (values (date_trunc('month', t.today)),
                            (date_trunc('month', t.today) - interval '1 month')) v(mo)
  ), w as (
    select m.id, m.tz, m.month_start,
           ((m.month_start + interval '1 month' + interval '5 days')::timestamp - interval '1 minute') at time zone m.tz due,
           coalesce(
             (select max(coalesce(e.ends_at, e.starts_at + interval '3 hours'))
              from events e
              where e.team_id = m.id
                and (e.starts_at at time zone m.tz)::date >= m.month_start
                and (e.starts_at at time zone m.tz)::date < (m.month_start + interval '1 month')::date),
             ((m.month_start + interval '1 month' - interval '5 days')::timestamp) at time zone m.tz
           ) ready
    from m
  ), made as (
    insert into tasks (team_id, kind, period, due_at, assigned_to)
    select w.id, k.kind, to_char(w.month_start, 'YYYY-MM') || '-end', w.due,
           private.task_assignee(w.id, k.kind, null, current_date)
    from w join task_kinds k on k.kind = 'promo_monthly_recap' and k.archived_at is null
                             and (k.team_id is null or k.team_id = w.id)
    left join team_task_kinds s on s.team_id = w.id and s.kind = k.kind
    where now() >= w.ready and now() < w.due
      and (coalesce(s.enabled, k.default_enabled) or private.has_owner(w.id, k.kind))
    on conflict (team_id, kind, period) where period is not null do nothing
    returning 1
  ) select count(*) into n from made;
  v_count := v_count + n;

  -- ...and gone once 5 days into the next month.
  update tasks t set dismissed_at = now()
  from task_kinds k
  where k.kind = t.kind and k.schedule = 'month_end'
    and t.done_at is null and t.dismissed_at is null and t.due_at < now();
  -- Feedback reviewed: a week after asking, if anyone answered.
  with fb as (
    select t.team_id, t.id, t.done_at from tasks t
    where t.kind = 'com_feedback' and t.done_at between now() - interval '14 days' and now() - interval '7 days'
  ), made as (
    insert into tasks (team_id, kind, period, due_at, assigned_to)
    select fb.team_id, k.kind, 'review:' || fb.id, fb.done_at + interval '10 days',
           private.task_assignee(fb.team_id, k.kind, null, current_date)
    from fb join task_kinds k on k.kind = 'com_feedback_review' and k.archived_at is null
    where exists (select 1 from volunteer_feedback v
                  where v.team_id = fb.team_id and v.created_at > fb.done_at - interval '3 days')
    on conflict (team_id, kind, period) where period is not null do nothing
    returning 1
  ) select count(*) into n from made;
  v_count := v_count + n;
  return v_count;
end $function$;

update task_kinds set description = 'Make a recap carousel of this month''s photos (Make recap): a big cover, one photo per slide with its event''s name, date, place and type, and next month''s events at the end. Post it on Instagram and Facebook. Shows up once the month''s last event has finished.'
where kind = 'promo_monthly_recap';
update task_kinds set description = 'Post next month''s events as one "What''s on in …" graphic on Instagram and Facebook (and the community chat). Every event gets an emoji, repeats show once with "Also on …", and you can tick which ones to show (up to 8). Shows up 3 days before the month ends.'
where kind = 'promo_month_calendar';

update task_kinds set description = 'Connect a regular member with each newcomer so they feel welcome. Comes up on Monday for last week''s newcomers; each one ticks itself off once someone is connected.'
where kind = 'com_buddies';

-- Run once when applied (26 Nov 2026): open November recaps for communities
-- whose last November event hadn't finished, and every open November month
-- calendar, were deleted so they come back at the new times.
