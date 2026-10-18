-- Team attendance links: one QR for a team (not one event) that always opens
-- whatever event is on today. A volunteer can keep it for weeks and never has
-- to pick an event. On days with no event it shows nothing but "no event today".

alter table checkin_links alter column event_id drop not null;
alter table checkin_links add column team_id uuid references teams (id) on delete cascade;
alter table checkin_links add constraint checkin_links_scope check ((event_id is null) <> (team_id is null));
create index checkin_links_team_idx on checkin_links (team_id) where team_id is not null;

alter policy "organisers manage team checkin links" on checkin_links
  using (private.is_team_organiser(coalesce(team_id, private.event_team(event_id))))
  with check (private.is_team_organiser(coalesce(team_id, private.event_team(event_id))));

-- Today's event for a team (Sydney date): the one on now, else the closest in time.
create or replace function private.todays_event(p_team_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select e.id from events e
  where e.team_id = p_team_id
    and (e.starts_at at time zone 'Australia/Sydney')::date = (now() at time zone 'Australia/Sydney')::date
  order by
    case when now() between e.starts_at - interval '3 hours'
                        and coalesce(e.ends_at, e.starts_at + interval '4 hours') + interval '3 hours'
         then 0 else 1 end,
    abs(extract(epoch from (e.starts_at - now())))
  limit 1;
$$;

-- The event an active link works on right now (null if none).
create or replace function private.active_link_event(p_token text)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(l.event_id, private.todays_event(l.team_id)) from checkin_links l
  where l.token = p_token and l.revoked_at is null and l.expires_at > now();
$$;

revoke execute on function private.todays_event(uuid), private.active_link_event(text) from public, anon, authenticated;

-- Helper screen: also reports "no event today" for team links.
create or replace function public.helper_checkin_state(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_event events%rowtype;
  v_id uuid := private.active_link_event(p_token);
  v_link checkin_links%rowtype;
begin
  if v_id is null then
    -- A live team link on a day with no event: say when the next one is.
    select * into v_link from checkin_links
    where token = p_token and revoked_at is null and expires_at > now() and team_id is not null;
    if found then
      return jsonb_build_object('status', 'no_event', 'next_event', (
        select jsonb_build_object('title', e.title, 'starts_at', e.starts_at)
        from events e where e.team_id = v_link.team_id and e.starts_at > now()
        order by e.starts_at limit 1));
    end if;
    return jsonb_build_object('status', 'inactive');
  end if;
  select * into v_event from events where id = v_id;
  return jsonb_build_object(
    'status', 'ok',
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
