-- No rain backup action for co-working events (Kai, 6 Nov 2026: "they're
-- inside"). The forecast is still recorded; only the action is skipped.
-- Open ones already made for co-working events are dismissed.

create or replace function public.record_rain_forecast(p_rows jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $function$
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
    left join event_types et on et.id = e.event_type_id
    left join team_task_kinds s on s.team_id = e.team_id and s.kind = 'rain_backup'
    where e.rain_chance > 30
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
end $function$;

update tasks t set dismissed_at = now()
from events e left join event_types et on et.id = e.event_type_id
where t.event_id = e.id and t.kind = 'rain_backup'
  and t.done_at is null and t.dismissed_at is null
  and public.event_kind(et.name, e.title) = 'coworking';
