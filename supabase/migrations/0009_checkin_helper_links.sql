-- Check-in helper links: an organiser shares a QR/link for ONE event so anyone
-- at the door can tick people in, without logging in. Helpers see names only
-- (no photos or contact details), can't see anything else, and the link stops
-- working a few hours after the event ends or when the organiser turns it off.

create table checkin_links (
  token       text primary key default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  event_id    uuid not null references events (id) on delete cascade,
  created_by  uuid references organisers (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz
);

create index checkin_links_event_idx on checkin_links (event_id);

alter table checkin_links enable row level security;

create policy "organisers manage team checkin links" on checkin_links
  for all to authenticated
  using (private.is_team_organiser(private.event_team(event_id)))
  with check (private.is_team_organiser(private.event_team(event_id)));

-- Which helper link a check-in came through (null = an organiser did it).
alter table attendance add column checkin_link text references checkin_links (token) on delete set null;

-- The event a still-active link is for, or null.
create or replace function private.active_link_event(p_token text)
returns uuid language sql stable security definer set search_path = public as $$
  select event_id from checkin_links
  where token = p_token and revoked_at is null and expires_at > now();
$$;

-- Everything the helper screen needs, in one call. Names only.
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
      where e.team_id = v_event.team_id and e.starts_at < v_event.starts_at), '[]'::jsonb)
  );
end;
$$;

-- Tick someone in or out.
create or replace function public.helper_set_checkin(p_token text, p_person_id uuid, p_here boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := private.active_link_event(p_token);
begin
  if v_id is null then return false; end if;
  if not exists (
    select 1 from people p join events e on e.team_id = p.team_id
    where p.id = p_person_id and e.id = v_id
  ) then return false; end if;

  if p_here then
    insert into attendance (event_id, person_id, checkin_link)
    values (v_id, p_person_id, p_token)
    on conflict (event_id, person_id) do nothing;
  else
    delete from attendance where event_id = v_id and person_id = p_person_id;
  end if;
  return true;
end;
$$;

-- Add a newcomer by name and check them in.
create or replace function public.helper_add_person(p_token text, p_first text, p_last text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := private.active_link_event(p_token);
  v_team uuid;
  v_person uuid;
begin
  if v_id is null or coalesce(trim(p_first), '') = '' then return null; end if;
  select team_id into v_team from events where id = v_id;
  insert into people (team_id, first_name, last_name, added_via)
  values (v_team, trim(p_first), nullif(trim(p_last), ''), 'host')
  returning id into v_person;
  insert into attendance (event_id, person_id, checkin_link) values (v_id, v_person, p_token);
  return jsonb_build_object('id', v_person, 'first_name', trim(p_first), 'last_name', nullif(trim(p_last), ''));
end;
$$;

revoke execute on function private.active_link_event(text) from public, anon, authenticated;
grant execute on function public.helper_checkin_state(text), public.helper_set_checkin(text, uuid, boolean),
  public.helper_add_person(text, text, text) to anon, authenticated;
