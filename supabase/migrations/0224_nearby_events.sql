-- Nearby communities' upcoming events for an organiser's Events list
-- (Kai, 12 Nov 2026). Read-only listing: title, time, place, link.
create or replace function public.nearby_events(p_team_id uuid, p_km integer, p_from timestamptz, p_to timestamptz)
returns table (id uuid, team_name text, title text, starts_at timestamptz, ends_at timestamptz,
               venue text, address text, source_url text, km integer)
language sql stable security definer set search_path = public as $$
  with me as (select lat, lng from teams where id = p_team_id),
  near as (
    select t.id, t.name,
      round(6371 * acos(least(1, greatest(-1,
        cos(radians(me.lat)) * cos(radians(t.lat)) * cos(radians(t.lng) - radians(me.lng))
        + sin(radians(me.lat)) * sin(radians(t.lat))))))::int as km
    from teams t, me
    where private.is_team_organiser(p_team_id)
      and t.id <> p_team_id and t.lat is not null and me.lat is not null
      and not coalesce(t.is_example, false) and not coalesce(t.is_practice, false)
  )
  select e.id, split_part(n.name, ',', 1), e.title, e.starts_at, e.ends_at,
         e.venue, e.address, e.source_url, n.km
  from near n join events e on e.team_id = n.id
  where n.km <= least(greatest(p_km, 1), 300)
    and e.starts_at >= p_from and e.starts_at < p_to
    and not coalesce(e.time_unknown, false)
  order by e.starts_at
  limit 60;
$$;
revoke execute on function public.nearby_events(uuid, integer, timestamptz, timestamptz) from public, anon;
grant execute on function public.nearby_events(uuid, integer, timestamptz, timestamptz) to authenticated;
