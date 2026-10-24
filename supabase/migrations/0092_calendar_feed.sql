-- (Applied as calendar_feed.) A calendar feed per community: a secret token
-- in the URL (calendar apps can't log in) that returns its events, for
-- "Subscribe in Google Calendar" and "Download all".
alter table teams add column calendar_token text unique default encode(gen_random_bytes(12), 'hex');
update teams set calendar_token = encode(gen_random_bytes(12), 'hex') where calendar_token is null;

create or replace function public.calendar_feed(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'team', t.name,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'venue', e.venue, 'address', e.address, 'description', e.description,
        'url', e.source_url, 'updated_at', e.updated_at) order by e.starts_at)
      from events e
      where e.team_id = t.id and e.starts_at > now() - interval '30 days'), '[]'::jsonb))
  from teams t where t.calendar_token = p_token and length(p_token) >= 20;
$$;
grant execute on function public.calendar_feed(text) to anon, authenticated;
