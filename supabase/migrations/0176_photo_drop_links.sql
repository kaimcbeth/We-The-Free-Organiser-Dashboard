-- Photo upload links (Kai, 5 Nov 2026): an organiser or Core Team member
-- makes a temporary QR code / link; anyone with it can add photos to the
-- community's Photo Hub (or one event) without logging in, until it expires
-- or is stopped. Files go to event-photos/<team>/<event or library>/drop-<token>-<id>.jpg.

alter table event_photos add column if not exists dropped_by text;

create table if not exists photo_drop_links (
  token text primary key,
  team_id uuid not null references teams(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  stopped_at timestamptz,
  uploads int not null default 0
);
alter table photo_drop_links enable row level security;
create policy "core read drop links" on photo_drop_links for select to authenticated
  using (private.is_team_core(team_id));

-- A live link: not stopped, not expired, under 500 photos.
create or replace function private.live_drop(p_token text)
returns photo_drop_links
language sql stable security definer set search_path = public
as $$
  select * from photo_drop_links
   where token = p_token and stopped_at is null and expires_at > now() and uploads < 500;
$$;

-- Storage: a file name made for a live link (right team, right folder).
create or replace function public.photo_drop_path_ok(p_name text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_file text := split_part(p_name, '/', 3);
  v_link photo_drop_links;
begin
  if split_part(p_name, '/', 4) <> '' or v_file !~ '^drop-[0-9a-f]{32}-[0-9a-f-]{36}\.jpg$' then
    return false;
  end if;
  v_link := private.live_drop(substr(v_file, 6, 32));
  return v_link.token is not null
    and split_part(p_name, '/', 1) = v_link.team_id::text
    and split_part(p_name, '/', 2) = coalesce(v_link.event_id::text, 'library');
end $$;

create policy "photo drop upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'event-photos' and public.photo_drop_path_ok(name));

-- Make a link. Hours: 1 to 168.
create or replace function public.create_photo_drop(p_team_id uuid, p_event_id uuid, p_hours int)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_token text;
begin
  if not private.is_team_core(p_team_id) then return null; end if;
  if p_event_id is not null and not exists (select 1 from events where id = p_event_id and team_id = p_team_id) then
    return null;
  end if;
  v_token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into photo_drop_links (token, team_id, event_id, expires_at)
  values (v_token, p_team_id, p_event_id, now() + make_interval(hours => greatest(1, least(coalesce(p_hours, 24), 168))));
  return v_token;
end $$;

create or replace function public.stop_photo_drop(p_token text)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  update photo_drop_links set stopped_at = now()
   where token = p_token and private.is_team_core(team_id) and stopped_at is null;
  return found;
end $$;

-- For the public upload page: what the link is for (null when it's ended).
create or replace function public.photo_drop_info(p_token text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
           'team_id', l.team_id,
           'event_id', l.event_id,
           'community', t.name,
           'event', e.title,
           'expires_at', l.expires_at)
    from private.live_drop(p_token) l
    join teams t on t.id = l.team_id
    left join events e on e.id = l.event_id
   where l.token is not null;
$$;

-- After a file is uploaded: add it to the Photo Hub.
create or replace function public.add_dropped_photo(p_token text, p_path text, p_width int, p_height int,
                                                    p_phash text, p_name text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_link photo_drop_links;
begin
  v_link := private.live_drop(p_token);
  if v_link.token is null then return 'ended'; end if;
  if not public.photo_drop_path_ok(p_path) or substr(split_part(p_path, '/', 3), 6, 32) <> p_token then
    return 'bad';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'event-photos' and name = p_path) then
    return 'missing';
  end if;
  insert into event_photos (team_id, event_id, path, width, height, phash, uploaded_by, dropped_by)
  values (v_link.team_id, v_link.event_id, p_path, p_width, p_height,
          nullif(p_phash, ''), null, nullif(left(trim(p_name), 60), ''))
  on conflict (path) do nothing;
  update photo_drop_links set uploads = uploads + 1 where token = p_token;
  return 'ok';
end $$;

revoke all on function public.create_photo_drop(uuid, uuid, int), public.stop_photo_drop(text) from public, anon;
grant execute on function public.create_photo_drop(uuid, uuid, int), public.stop_photo_drop(text) to authenticated;
grant execute on function public.photo_drop_path_ok(text), public.photo_drop_info(text), public.add_dropped_photo(text, text, int, int, text, text) to anon, authenticated;

-- The older event-photos policies were for every role; anon can't run
-- private.is_team_core, so they'd error for link uploads. Signed-in only.
alter policy "event photos upload" on storage.objects to authenticated;
alter policy "event photos read" on storage.objects to authenticated;
