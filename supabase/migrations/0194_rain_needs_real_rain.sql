-- Rain backup plans only for real rain (Kai, 6 Nov 2026: the Sydney potluck
-- said 77% while Google said 15%). Open-Meteo's chance is for any measurable
-- rain (0.1 mm+), so drizzle scored high. Now the rain check also stores the
-- total expected rain while the event is on (events.rain_mm), and the action
-- needs chance > 30% AND at least 1 mm. When a later check drops below that,
-- undone rain plans for the event are put away.

alter table events add column if not exists rain_mm numeric;

create or replace function public.record_rain_forecast(p_rows jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare
  v_count int;
begin
  update events e
     set rain_chance = (r->>'chance')::int, rain_mm = (r->>'mm')::numeric, rain_checked_at = now()
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
    where e.rain_chance > 30
      and e.rain_mm >= 1
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
    select coalesce(p.user_id, o.id), 'task', 'Rain forecast: ' || e.title,
           e.rain_chance || '% chance of rain, about ' || round(e.rain_mm) || ' mm. Time for a backup plan.',
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
     and not (coalesce(e.rain_chance, 0) > 30 and coalesce(e.rain_mm, 0) >= 1);

  return v_count;
end $function$;
