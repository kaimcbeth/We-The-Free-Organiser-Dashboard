-- (Applied as buddy_contact.)
-- New member support: the supporter can contact their newcomer (phone shared
-- only with whoever is supporting them), for WhatsApp / Call / Save contact.
CREATE OR REPLACE FUNCTION public.my_buddy_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me people%rowtype;
begin
  select * into v_me from people where user_id = auth.uid() limit 1;
  if not found then return jsonb_build_object('status', 'no_profile'); end if;

  return jsonb_build_object(
    'status', 'ok',
    'is_buddy', v_me.is_buddy,
    'notify_channel', v_me.notify_channel,
    'pairs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pairing_id', bp.id,
        'since', bp.created_at,
        'newcomer', jsonb_build_object('id', n.id, 'first_name', n.first_name, 'last_name', n.last_name, 'phone', n.phone),
        'events', (select count(*) from attendance a join events e on e.id = a.event_id
                   where a.person_id = n.id and e.starts_at <= now()),
        'last_seen', (select max(e.starts_at) from attendance a join events e on e.id = a.event_id
                      where a.person_id = n.id and e.starts_at <= now()),
        'prompts', coalesce((
          select jsonb_agg(jsonb_build_object('id', p.id, 'kind', p.kind, 'due_at', p.due_at, 'done_at', p.done_at)
                           order by p.due_at)
          from buddy_prompts p where p.pairing_id = bp.id), '[]'::jsonb)
      ) order by bp.created_at desc)
      from buddy_pairings bp join people n on n.id = bp.newcomer_id
      where bp.buddy_id = v_me.id and bp.ended_at is null), '[]'::jsonb),
    'available', case when v_me.is_buddy then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'first_name', x.first_name, 'last_name', x.last_name,
        'first_event_title', x.title, 'first_event_at', x.starts_at) order by x.starts_at desc)
      from (
        select distinct on (p.id) p.id, p.first_name, p.last_name, e.title, e.starts_at
        from people p
        join attendance a on a.person_id = p.id
        join events e on e.id = a.event_id
        where p.team_id = v_me.team_id
          and p.id <> v_me.id
          and not p.attended_before_app
          and not p.is_buddy
          and (not p.is_test or private.is_god())
          and not exists (select 1 from buddy_pairings bp where bp.newcomer_id = p.id and bp.ended_at is null)
          and e.starts_at <= now()
        order by p.id, e.starts_at asc
      ) x
      where x.starts_at > now() - interval '45 days'), '[]'::jsonb) else '[]'::jsonb end,
    'upcoming_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'title', e.title, 'starts_at', e.starts_at,
        'venue', coalesce(e.venue, e.address), 'url', e.source_url,
        'type', t.name) order by e.starts_at)
      from (select * from events where team_id = v_me.team_id and starts_at > now() order by starts_at limit 4) e
      left join event_types t on t.id = e.event_type_id), '[]'::jsonb)
  );
end;
$function$;
