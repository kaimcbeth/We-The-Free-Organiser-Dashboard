-- Team locations, so organisers can see events from teams near them
-- (the calendar's distance slider).
alter table teams add column lat double precision, add column lng double precision;

update teams t set lat = v.lat, lng = v.lng from (values
  ('sydney-au', -33.8688, 151.2093),
  ('perth-au', -31.9523, 115.8613),
  ('parramatta-au', -33.8150, 151.0011),
  ('adelaide-au', -34.9285, 138.6007),
  ('gold-coast-au', -28.0167, 153.4000),
  ('brisbane-qld-au', -27.4698, 153.0251),
  ('townsville-qld-au', -19.2590, 146.8169),
  ('sunshine-coast-au', -26.6500, 153.0667),
  ('manly-au', -33.7969, 151.2840),
  ('christchurch-nz', -43.5321, 172.6362),
  ('wellington-nz', -41.2865, 174.7762)
) as v(slug, lat, lng) where t.slug = v.slug;

create or replace function private.km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

-- Every team with its distance from the organiser's team, plus (read-only)
-- events for the teams they asked for: p_mode 'region' = their region,
-- 'km' = within p_km, 'all' = everywhere.
create or replace function public.nearby_calendar(p_from timestamptz, p_to timestamptz, p_mode text, p_km double precision default null)
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (
    select t.id as team_id, t.region_id, t.lat, t.lng
    from organisers o join teams t on t.id = o.team_id
    where o.id = auth.uid() and o.access in ('organiser', 'core_team')
  ),
  all_teams as (
    select t.id, t.name, t.timezone, t.region_id = me.region_id as in_region,
           case when t.id = me.team_id then 0
                when t.lat is null or me.lat is null then null
                else private.km_between(me.lat, me.lng, t.lat, t.lng) end as km
    from teams t cross join me
  ),
  picked as (
    select * from all_teams
    where p_mode = 'all'
       or (p_mode = 'region' and in_region)
       or (p_mode = 'km' and km is not null and km <= coalesce(p_km, 0))
  )
  select jsonb_build_object(
    'teams', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'timezone', timezone, 'in_region', in_region, 'km', round(km::numeric)) order by km nulls last)
      from all_teams), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'team_id', e.team_id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'venue', coalesce(e.venue, e.address), 'type', ty.name, 'url', e.source_url) order by e.starts_at)
      from events e
      join picked p on p.id = e.team_id
      left join event_types ty on ty.id = e.event_type_id
      where e.starts_at >= p_from and e.starts_at < p_to
        and p_to - p_from <= interval '62 days'), '[]'::jsonb)
  );
$$;

revoke execute on function private.km_between(double precision, double precision, double precision, double precision) from public, anon;
revoke execute on function public.nearby_calendar(timestamptz, timestamptz, text, double precision) from public, anon;
grant execute on function public.nearby_calendar(timestamptz, timestamptz, text, double precision) to authenticated;

-- (Follow-up, applied as nearby_calendar_for_team) The calendar passes the team
-- being viewed, so God Mode previews work too. Same body as above, with:
--   create or replace function public.nearby_calendar(p_team_id uuid, p_from timestamptz, p_to timestamptz, p_mode text, p_km double precision default null)
--   me = the team p_team_id, if private.is_team_core(p_team_id)
-- and the 4-argument version is no longer callable:
--   revoke execute on function public.nearby_calendar(timestamptz, timestamptz, text, double precision) from authenticated;
-- (Follow-up, applied as nearby_calendar_coords) nearby_calendar also returns each team's lat/lng for the map.
