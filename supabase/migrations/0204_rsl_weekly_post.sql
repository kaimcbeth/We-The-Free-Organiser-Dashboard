-- Kai, 6 Nov 2026: "Make weekly post in organiser group chat". A built-in
-- region-wide RSL action, made each week for every region that has an RSL
-- (or a God account leading it). Regions can switch it off in Plan RSL actions.

insert into task_kinds (kind, title, blurb, description, estimate_minutes, anchor, appear_hours,
                        due_after_hours, sort_order, audience, schedule, default_enabled)
values ('rsl_weekly_post', 'Weekly post shared in the organiser group chat',
        'A weekly post to keep your organisers connected',
        'One post in the organiser group chat this week. Ideas: a win from one of the communities, a photo from a recent event, a tip that worked somewhere, what''s coming up (hangouts, special events, trainings), a question to get organisers talking, or a thank-you to someone who went above and beyond.',
        15, 'start', 0, 0, 40, 'regional', 'region_weekly', true)
on conflict (kind) do nothing;

-- Built-in region-wide kinds (region_id null) go to every region with a lead.
create or replace function private.create_region_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with r as (
    select g.id, coalesce((select t.timezone from teams t where t.region_id = g.id
                           group by 1 order by count(*) desc limit 1), 'Australia/Sydney') tz
    from regions g
  ), d as (
    select r.id, r.tz, (now() at time zone r.tz)::date today,
           exists (select 1 from organisers o
                   where (o.access = 'regional_lead' and o.region_id = r.id)
                      or (o.access = 'god' and o.lead_region_id = r.id)) has_lead
    from r
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
    from d join task_kinds k on (k.region_id = d.id or (k.region_id is null and d.has_lead))
                             and k.audience = 'regional'
                             and k.archived_at is null and k.team_id is null
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

select private.create_region_tasks();
