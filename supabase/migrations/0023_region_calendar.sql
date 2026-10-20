-- Organisers can peek at other teams' events in their region (read-only:
-- title, type, time, place and the activism.wtf link; nothing about people).
create or replace function public.region_calendar(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (
    select t.region_id
    from organisers o join teams t on t.id = o.team_id
    where o.id = auth.uid() and o.access in ('organiser', 'core_team')
  ),
  region_teams as (
    select t.id, t.name, t.timezone from teams t join me on t.region_id = me.region_id
  )
  select jsonb_build_object(
    'teams', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'timezone', timezone) order by name) from region_teams), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'team_id', e.team_id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'venue', coalesce(e.venue, e.address), 'type', ty.name, 'url', e.source_url) order by e.starts_at)
      from events e
      join region_teams rt on rt.id = e.team_id
      left join event_types ty on ty.id = e.event_type_id
      where e.starts_at >= p_from and e.starts_at < p_to
        and p_to - p_from <= interval '62 days'), '[]'::jsonb)
  );
$$;

revoke execute on function public.region_calendar(timestamptz, timestamptz) from public, anon;
grant execute on function public.region_calendar(timestamptz, timestamptz) to authenticated;
