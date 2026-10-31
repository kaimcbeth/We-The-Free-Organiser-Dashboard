-- Rain backup plans (Kai, 1 Nov 2026): when the forecast for an upcoming
-- event is more than 30% chance of rain, the community gets an action to
-- make a backup plan. The rain-check Edge Function (cron every 3 hours)
-- reads Open-Meteo for each community's location and calls
-- record_rain_forecast with the highest hourly chance during each event.

alter table events
  add column if not exists rain_chance int,
  add column if not exists rain_checked_at timestamptz;

alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check check (schedule = any (array[
  'event', 'weekly', 'monthly', 'quarterly', 'newcomer', 'month_end', 'follow_up', 'special', 'weather']));

insert into task_kinds (kind, title, description, blurb, estimate_minutes, estimate_max_minutes,
                        due_after_hours, sort_order, anchor, appear_hours, audience, schedule,
                        default_enabled, late_ok)
values ('rain_backup', 'Rain backup plan made',
        'Rain is forecast for this event. Pick a backup: a covered spot nearby, another day, or something that works indoors. Then let everyone know in the group chat.',
        'When rain is forecast (over 30%), make a backup plan.',
        10, 20, -12, 1, 'start', -168, 'community', 'weather', true, true)
on conflict (kind) do nothing;

create or replace function public.record_rain_forecast(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update events e
     set rain_chance = (r->>'chance')::int, rain_checked_at = now()
    from jsonb_array_elements(p_rows) r
   where e.id = (r->>'event_id')::uuid;

  with candidates as (
    select e.id event_id, e.team_id, e.title, e.starts_at,
           private.task_assignee(e.team_id, 'rain_backup', e.event_type_id,
                                 (now() at time zone coalesce(t.timezone, 'Australia/Sydney'))::date) assignee
    from events e
    join teams t on t.id = e.team_id
    left join team_task_kinds s on s.team_id = e.team_id and s.kind = 'rain_backup'
    where e.rain_chance > 30
      and e.starts_at > now() + interval '2 hours'
      and e.starts_at < now() + interval '8 days'
      and not t.is_example and not t.is_practice
      and coalesce(s.enabled, true)
      and (select k.archived_at from task_kinds k where k.kind = 'rain_backup') is null
  ), made as (
    insert into tasks (team_id, event_id, kind, due_at, assigned_to)
    select team_id, event_id, 'rain_backup',
           greatest(least(starts_at - interval '12 hours', now() + interval '1 day'), now() + interval '1 hour'),
           assignee
    from candidates
    on conflict (event_id, kind) do nothing
    returning id, team_id, event_id, assigned_to
  ), notified as (
    -- The assignee, or the community's organisers when no one has it.
    insert into notifications (user_id, kind, title, body, url, task_id)
    select coalesce(p.user_id, o.id), 'task', 'Rain forecast: ' || e.title,
           e.rain_chance || '% chance of rain. Time for a backup plan.',
           case when p.user_id is not null then '/me#tasks' else '/tasks' end, m.id
    from made m
    join events e on e.id = m.event_id
    left join people p on p.id = m.assigned_to
    left join organisers o on m.assigned_to is null
      and ((o.access = 'organiser' and o.team_id = m.team_id)
           or (o.access = 'god' and o.organiser_team_id = m.team_id))
    where coalesce(p.user_id, o.id) is not null
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end $$;

revoke all on function public.record_rain_forecast(jsonb) from public, anon, authenticated;
grant execute on function public.record_rain_forecast(jsonb) to service_role;

-- Every 3 hours, at :52.
select cron.schedule('rain-check', '52 */3 * * *', $$
  select net.http_post(
    url := 'https://jmslxbygvmjtwwxuzkrt.supabase.co/functions/v1/rain-check',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000)
$$);
