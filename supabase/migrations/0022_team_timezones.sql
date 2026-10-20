-- Use each team's own time zone (not Sydney) for "today's event", the
-- likely-first ordering, and tell helper screens which time zone to show.

create or replace function private.team_tz(p_team_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select timezone from teams where id = p_team_id), 'Australia/Sydney');
$$;
revoke execute on function private.team_tz(uuid) from public, anon, authenticated;

create or replace function private.todays_event(p_team_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select e.id from events e
  where e.team_id = p_team_id
    and (e.starts_at at time zone private.team_tz(p_team_id))::date = (now() at time zone private.team_tz(p_team_id))::date
  order by
    case when now() between e.starts_at - interval '3 hours'
                        and coalesce(e.ends_at, e.starts_at + interval '4 hours') + interval '3 hours'
         then 0 else 1 end,
    abs(extract(epoch from (e.starts_at - now())))
  limit 1;
$$;

create or replace function private.likely_scores(p_event_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with target as (
    select e.id, e.team_id, e.starts_at,
           coalesce(t.counts_as_outreach, false) as outreach,
           private.team_tz(e.team_id) as tz,
           extract(dow from e.starts_at at time zone private.team_tz(e.team_id)) as dow
    from events e left join event_types t on t.id = e.event_type_id
    where e.id = p_event_id
  ),
  history as (
    select a.person_id,
           power(0.5, extract(epoch from (tg.starts_at - e.starts_at)) / 86400.0 / 42.0)
             * case when coalesce(t.counts_as_outreach, false) = tg.outreach then 1.0 else 0.4 end
             * case when extract(dow from e.starts_at at time zone tg.tz) = tg.dow then 1.3 else 1.0 end
             as pts
    from target tg
    join events e on e.team_id = tg.team_id and e.starts_at < tg.starts_at
                 and e.starts_at > tg.starts_at - interval '365 days' and e.id <> tg.id
    join attendance a on a.event_id = e.id
    left join event_types t on t.id = e.event_type_id
  ),
  fresh as (
    select p.id as person_id, 0.4::float8 as pts
    from target tg join people p on p.team_id = tg.team_id
    where p.created_at > tg.starts_at - interval '21 days' and p.created_at <= tg.starts_at
      and not exists (select 1 from attendance a where a.person_id = p.id)
  )
  select coalesce(jsonb_object_agg(person_id, round(score::numeric, 3)), '{}'::jsonb)
  from (
    select person_id, sum(pts) as score from (select * from history union all select * from fresh) x
    group by person_id
  ) s;
$$;

-- Attendance screen data now includes the team's time zone.
create or replace function private.checkin_state(v_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_event events%rowtype;
begin
  select * into v_event from events where id = v_id;
  return jsonb_build_object(
    'status', 'ok',
    'timezone', private.team_tz(v_event.team_id),
    'event', jsonb_build_object(
      'id', v_event.id, 'title', v_event.title, 'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at, 'venue', coalesce(v_event.venue, v_event.address)),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name)
                       order by lower(p.first_name), lower(coalesce(p.last_name, '')))
      from people p where p.team_id = v_event.team_id), '[]'::jsonb),
    'checked_in', coalesce((select jsonb_agg(a.person_id) from attendance a where a.event_id = v_id), '[]'::jsonb),
    'returning', coalesce((
      select jsonb_agg(distinct x.id) from (
        select a.person_id as id
        from attendance a join events e on e.id = a.event_id
        where e.team_id = v_event.team_id and e.starts_at < v_event.starts_at
        union
        select p.id from people p where p.team_id = v_event.team_id and p.attended_before_app
      ) x), '[]'::jsonb),
    'is_outreach', coalesce((select counts_as_outreach from event_types where id = v_event.event_type_id), false),
    'outreach_before', coalesce((
      select jsonb_object_agg(p.id, p.starting_outreach_count + (
        select count(*) from attendance a
        join events e on e.id = a.event_id
        join event_types t on t.id = e.event_type_id
        where a.person_id = p.id and t.counts_as_outreach and e.id <> v_id))
      from people p where p.team_id = v_event.team_id), '{}'::jsonb),
    'likely', private.likely_scores(v_id)
  );
end;
$$;

create or replace function public.helper_checkin_state(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid := private.active_link_event(p_token);
  v_link checkin_links%rowtype;
begin
  if v_id is null then
    select * into v_link from checkin_links
    where token = p_token and revoked_at is null and expires_at > now() and team_id is not null;
    if found then
      return jsonb_build_object('status', 'no_event', 'timezone', private.team_tz(v_link.team_id), 'next_event', (
        select jsonb_build_object('title', e.title, 'starts_at', e.starts_at)
        from events e where e.team_id = v_link.team_id and e.starts_at > now()
        order by e.starts_at limit 1));
    end if;
    return jsonb_build_object('status', 'inactive');
  end if;
  return private.checkin_state(v_id);
end;
$$;
