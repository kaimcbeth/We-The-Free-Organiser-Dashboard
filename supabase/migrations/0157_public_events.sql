-- A community's upcoming events, for anyone (no account): the shareable
-- /upcoming/<slug> page. Only what's already public on activism.wtf: title,
-- times, place, description, image and the activism.wtf link. No notes.
create or replace function public.public_events(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'team', jsonb_build_object('name', t.name, 'slug', t.slug,
                               'timezone', coalesce(t.timezone, 'Australia/Sydney'),
                               'url', t.activism_team_url),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'venue', e.venue, 'address', e.address,
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
