-- Helper check-in screen also shows outreach milestones (10th, 20th, ...).
-- Adds is_outreach and each person's outreach count (not counting this event).

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
      select jsonb_agg(distinct a.person_id)
      from attendance a join events e on e.id = a.event_id
      where e.team_id = v_event.team_id and e.starts_at < v_event.starts_at), '[]'::jsonb),
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
