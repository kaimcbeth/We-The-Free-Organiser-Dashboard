-- Meeting points (Kai, 11 Nov 2026: "pick a spot that then generates a
-- graphic to go on socials for our meeting point at events"). Each event can
-- keep the spot picked on the map, so it's there next time and the
-- community's earlier spots can be reused.
alter table public.events
  add column if not exists meet_lat double precision,
  add column if not exists meet_lng double precision,
  add column if not exists meet_note text check (char_length(meet_note) <= 200),
  add column if not exists meet_zoom smallint;

-- Save (or clear, with nulls) an event's meeting point. Core Team and up.
create or replace function public.set_meeting_point(
  p_event_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_note text,
  p_zoom smallint default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  select team_id into v_team from events where id = p_event_id;
  if v_team is null or not private.is_team_core(v_team) then
    return false;
  end if;
  if (p_lat is null) <> (p_lng is null)
     or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return false;
  end if;
  update events
     set meet_lat = p_lat, meet_lng = p_lng,
         meet_note = nullif(btrim(left(p_note, 200)), ''),
         meet_zoom = p_zoom
   where id = p_event_id;
  return true;
end $$;
revoke all on function public.set_meeting_point(uuid, double precision, double precision, text, smallint) from public, anon;
grant execute on function public.set_meeting_point(uuid, double precision, double precision, text, smallint) to authenticated;

-- The community's spots used before (newest first, one per place), plus the
-- community's own position for centring the map.
create or replace function public.team_meeting_points(p_team_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not private.is_team_core(p_team_id) then null else
    jsonb_build_object(
      'centre', (select jsonb_build_object('lat', lat, 'lng', lng)
                   from teams where id = p_team_id),
      'spots', coalesce((
        select jsonb_agg(s order by s->>'used' desc)
          from (
            select distinct on (round(meet_lat::numeric, 4), round(meet_lng::numeric, 4))
                   jsonb_build_object('lat', meet_lat, 'lng', meet_lng,
                     'note', meet_note, 'zoom', meet_zoom,
                     'event', title, 'used', starts_at) as s
              from events
             where team_id = p_team_id and meet_lat is not null
             order by round(meet_lat::numeric, 4), round(meet_lng::numeric, 4),
                      starts_at desc
          ) x
      ), '[]'::jsonb)
    ) end
$$;
revoke all on function public.team_meeting_points(uuid) from public, anon;
grant execute on function public.team_meeting_points(uuid) to authenticated;
