-- Weather backup plans cover heat too (Kai, 6 Nov 2026: "make the backup plan
-- action also be present for outdoor events if it's going to be over 30°C")
-- and the manual "Weather checked" action goes (the backup plan comes up on
-- its own). rain-check now also sends the hottest hour while the event is on
-- (events.max_temp); the action is made when rain (> 30% and >= 1 mm) or heat
-- (> 30°C) is forecast, still never for co-working (indoors). Renamed to
-- "Weather backup plan made"; the kind stays rain_backup.

alter table events add column if not exists max_temp numeric;

update task_kinds set archived_at = now() where kind = 'ev_weather' and archived_at is null;
update tasks set dismissed_at = now()
where kind = 'ev_weather' and done_at is null and dismissed_at is null;

update task_kinds set
  title = 'Weather backup plan made',
  blurb = 'When rain or heat over 30°C is forecast, make a backup plan.',
  description = 'The weather looks rough for this event. Pick a backup that fits: for rain, a covered spot nearby or something that works indoors; for heat, shade, plenty of water and a cooler time of day; or move it to another day. Then let everyone know in the group chat.'
where kind = 'rain_backup';

create or replace function public.record_rain_forecast(p_rows jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare
  v_count int;
begin
  update events e
     set rain_chance = (r->>'chance')::int, rain_mm = (r->>'mm')::numeric, max_temp = (r->>'temp')::numeric, rain_checked_at = now()
    from jsonb_array_elements(p_rows) r
   where e.id = (r->>'event_id')::uuid;

  with candidates as (
    select e.id event_id, e.team_id, e.title, e.starts_at,
           private.task_assignee(e.team_id, 'rain_backup', e.event_type_id,
                                 (now() at time zone coalesce(t.timezone, 'Australia/Sydney'))::date) assignee
    from events e
    join teams t on t.id = e.team_id
    left join event_types et on et.id = e.event_type_id
    left join team_task_kinds s on s.team_id = e.team_id and s.kind = 'rain_backup'
    where ((e.rain_chance > 30 and e.rain_mm >= 1) or e.max_temp > 30)
      and e.starts_at > now() + interval '2 hours'
      and e.starts_at < now() + interval '8 days'
      and not t.is_example and not t.is_practice
      and public.event_kind(et.name, e.title) <> 'coworking'
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
    insert into notifications (user_id, kind, title, body, url, task_id)
    select coalesce(p.user_id, o.id), 'task', 'Weather forecast: ' || e.title,
           concat_ws(', ',
             case when e.rain_chance > 30 and e.rain_mm >= 1
                  then e.rain_chance || '% chance of rain, about ' || round(e.rain_mm) || ' mm' end,
             case when e.max_temp > 30 then 'up to ' || round(e.max_temp) || '°C' end)
           || '. Time for a backup plan.',
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

  -- Forecast eased off (or it's only drizzle): put away rain plans nobody has
  -- done yet, for the events just checked.
  update tasks t set dismissed_at = now()
    from events e
   where t.event_id = e.id and t.kind = 'rain_backup'
     and t.done_at is null and t.dismissed_at is null
     and e.id in (select (r->>'event_id')::uuid from jsonb_array_elements(p_rows) r)
     and not ((coalesce(e.rain_chance, 0) > 30 and coalesce(e.rain_mm, 0) >= 1)
              or coalesce(e.max_temp, 0) > 30);

  return v_count;
end $function$;
