-- Movie Challenge debrief panel (Kai, 14 Nov 2026: "a debrief panel for 3mmc
-- with upcoming events and shoutouts for newcomers and how many events
-- they've done"). Everyone checked in at the event with how many events
-- they've been to so far (this one included, any community), first-timers
-- flagged, plus the community's next events and the day's film numbers.
-- Core Team and up, like check-in.
create or replace function public.event_debrief(p_event_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  e events%rowtype;
  tz text;
  d date;
begin
  select * into e from events where id = p_event_id;
  if not found or not private.is_team_core(e.team_id) then
    return null;
  end if;
  select coalesce(timezone, 'Australia/Sydney') into tz from teams where id = e.team_id;
  d := (e.starts_at at time zone tz)::date;

  return jsonb_build_object(
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'first_name', p.first_name, 'last_name', p.last_name,
               'events', n.events, 'before_app', p.attended_before_app,
               'first_time', n.events = 1 and not p.attended_before_app)
             order by a.checked_in_at)
      from attendance a
      join people p on p.id = a.person_id
      cross join lateral (
        select count(distinct a2.event_id)::int as events
        from attendance a2 join events e2 on e2.id = a2.event_id
        where a2.person_id = p.id and e2.starts_at <= e.starts_at
      ) n
      where a.event_id = e.id and not p.is_test
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', u.id, 'title', u.title, 'starts_at', u.starts_at,
               'ends_at', u.ends_at, 'venue', coalesce(u.moved_to, u.venue),
               'address', case when u.moved_to is null then u.address end)
             order by u.starts_at)
      from (select * from events
            where team_id = e.team_id and id <> e.id
              and starts_at > greatest(e.starts_at, now())
              and not coalesce(time_unknown, false)
            order by starts_at limit 6) u
    ), '[]'::jsonb),
    'watched', (select count(*) from film_survey_responses r
                where r.team_id = e.team_id and (r.answered_at at time zone tz)::date = d),
    'impact', (select round(avg(r.impact)::numeric, 1) from film_survey_responses r
               where r.team_id = e.team_id and (r.answered_at at time zone tz)::date = d)
  );
end;
$$;
revoke all on function public.event_debrief(uuid) from public, anon;
grant execute on function public.event_debrief(uuid) to authenticated;
