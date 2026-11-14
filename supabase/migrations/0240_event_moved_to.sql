-- Weather update → public list (Kai, 14 Nov 2026): when an organiser makes a
-- "New location" weather update graphic, they can put the new spot on the
-- public events list (/upcoming/<slug>). Kept apart from venue/address, which
-- the hourly activism.wtf import overwrites.
alter table public.events
  add column if not exists moved_to text,
  add column if not exists moved_at timestamptz;

create or replace function public.set_event_moved(p_event_id uuid, p_place text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_place text := nullif(left(trim(coalesce(p_place, '')), 200), '');
begin
  select team_id into v_team from events where id = p_event_id;
  if v_team is null or not private.is_team_core(v_team) then
    raise exception 'not allowed';
  end if;
  update events
     set moved_to = v_place,
         moved_at = case when v_place is null then null else now() end
   where id = p_event_id;
end;
$$;
revoke all on function public.set_event_moved(uuid, text) from public, anon;
grant execute on function public.set_event_moved(uuid, text) to authenticated;

create or replace function public.public_events(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'team', jsonb_build_object('name', t.name, 'slug', t.slug,
                               'timezone', coalesce(t.timezone, 'Australia/Sydney'),
                               'url', t.activism_team_url),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'venue', e.venue, 'address', e.address, 'moved_to', e.moved_to,
        'description', left(e.description, 600), 'image_url', e.image_url,
        'url', e.source_url) order by e.starts_at)
      from (select * from events
            where team_id = t.id
              and coalesce(ends_at, starts_at + interval '3 hours') > now()
              and starts_at < now() + interval '120 days'
            order by starts_at limit 40) e), '[]'::jsonb))
  from teams t
  where t.slug = p_slug and not t.is_example and not t.is_practice;
$$;
grant execute on function public.public_events(text) to anon, authenticated;
