-- Kai, 6 Nov 2026: "Make same incident report, mental health and feedback
-- reminder as organisers have. But all at 3 month intervals. Monthly shout out
-- task as well in group chat." Region-wide RSL actions for the organiser group
-- chat: three every quarter (new schedule region_quarterly: Jan/Apr/Jul/Oct,
-- due 30 days in) and a monthly shout-out.

alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check check (schedule = any (array[
  'event','weekly','fortnightly','monthly','quarterly','newcomer','month_end','follow_up',
  'special','weather','birthday','pod','season','region_weekly','region_monthly','region_quarterly']));

-- The monthly per-community RSL branch must leave region_quarterly alone.
do $$
declare v text;
begin
  select pg_get_functiondef('private.create_monthly_tasks()'::regprocedure) into v;
  if position('''region_quarterly''' in v) = 0 then
    v := replace(v,
      '''region_monthly'', ''quarterly'')',
      '''region_monthly'', ''quarterly'', ''region_quarterly'')');
    if position('''region_quarterly''' in v) = 0 then
      raise exception 'create_monthly_tasks patch did not apply';
    end if;
    execute v;
  end if;
end $$;


insert into task_kinds (kind, title, blurb, description, estimate_minutes, anchor, appear_hours,
                        due_after_hours, sort_order, audience, schedule, default_enabled)
values
  ('rsl_incident_form', 'Incident report form shared with organisers',
   'A reminder every 3 months that the incident report form is there',
   'Remind your organisers in the group chat that the incident report form is there for anything at an event that doesn''t feel right, and that they can always come to you.',
   5, 'start', 0, 0, 46, 'regional', 'region_quarterly', true),
  ('rsl_mental_health', 'Mental health resources shared with organisers',
   'A reminder every 3 months to look after themselves',
   'Share the mental health resources with your organisers in the group chat. Organising can be a lot, so remind them it''s okay to step back and that you''re there.',
   5, 'start', 0, 0, 47, 'regional', 'region_quarterly', true),
  ('rsl_feedback_ask', 'Organisers asked for feedback',
   'Every 3 months, ask organisers how Global Support could help more',
   'Ask your organisers in the group chat to share how things are going, using the Global Support feedback card in Resources (they can leave their name off).',
   5, 'start', 0, 0, 48, 'regional', 'region_quarterly', true),
  ('rsl_shout_out', 'Shout-out posted in the organiser group chat',
   'A monthly shout-out to an organiser or community',
   'Give a shout-out in the organiser group chat: an organiser who went above and beyond, a community that hit a milestone, a great event or a big turnout. Be specific about what they did.',
   10, 'start', 0, 0, 44, 'regional', 'region_monthly', true)
on conflict (kind) do nothing;

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
           case k.schedule
             when 'region_weekly' then to_char(d.today, 'IYYY-"W"IW')
             when 'region_quarterly' then to_char(d.today, 'YYYY-"Q"Q')
             else to_char(d.today, 'YYYY-MM') end period,
           case k.schedule
             when 'region_weekly' then
               greatest(((d.today - extract(isodow from d.today)::int + 7)::timestamp
                         + interval '23 hours 59 minutes') at time zone d.tz, now() + interval '1 day')
             when 'region_quarterly' then
               greatest(((date_trunc('quarter', d.today)::date + 30)::timestamp
                         + interval '23 hours 59 minutes') at time zone d.tz, now() + interval '3 days')
             else
               greatest(((to_char(d.today, 'YYYY-MM') || '-15 23:59')::timestamp at time zone d.tz),
                        now() + interval '3 days')
           end due_at
    from d join task_kinds k on (k.region_id = d.id or (k.region_id is null and d.has_lead))
                             and k.audience = 'regional'
                             and k.archived_at is null and k.team_id is null
                             and k.schedule in ('region_weekly', 'region_monthly', 'region_quarterly')
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
