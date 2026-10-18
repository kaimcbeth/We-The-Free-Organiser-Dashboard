-- "Not a first-timer": people who came to events before the app existed.
-- The app still marks first-timers automatically; organisers (or a helper at
-- the door) can untick this for someone who's actually been before.

alter table people add column attended_before_app boolean not null default false;
grant update (attended_before_app) on people to authenticated;

-- Helper links can mark someone as "been before" (or undo it) for this event's team.
create or replace function public.helper_set_attended_before(p_token text, p_person_id uuid, p_value boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := private.active_link_event(p_token);
begin
  if v_id is null then return false; end if;
  update people p set attended_before_app = p_value
  from events e
  where e.id = v_id and p.id = p_person_id and p.team_id = e.team_id;
  return found;
end;
$$;

grant execute on function public.helper_set_attended_before(text, uuid, boolean) to anon, authenticated;

-- Helper screen: anyone marked "been before" counts as returning.
create or replace function public.helper_checkin_state(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_event events%rowtype;
  v_id uuid := private.active_link_event(p_token);
begin
  if v_id is null then
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
      from people p where p.team_id = v_event.team_id), '{}'::jsonb)
  );
end;
$$;
