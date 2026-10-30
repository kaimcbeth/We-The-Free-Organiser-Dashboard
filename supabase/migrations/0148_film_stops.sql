-- Movie player "Stop" button: a viewer can stop the film at any time. Each
-- press is recorded (film, version, language, how far in) in film_stops, sent
-- through submit_film_surveys with the survey answers (rows with "stop": true).
-- The laptop's live status becomes 'stopped' so the organiser's phone alerts.
create table if not exists public.film_stops (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  client_id text not null unique check (char_length(client_id) between 8 and 80),
  film text not null check (char_length(film) between 1 and 200),
  version text check (char_length(version) <= 200),
  language text check (char_length(language) <= 40),
  stopped_at real, -- seconds into the film
  duration real,   -- the film's length
  stopped_on timestamptz not null,
  laptop text check (char_length(laptop) <= 40),
  created_at timestamptz not null default now()
);
create index if not exists film_stops_team_idx on public.film_stops (team_id, stopped_on desc);
alter table public.film_stops enable row level security;
create policy "organisers read their film stops" on public.film_stops for select
  to authenticated using (private.is_team_organiser(team_id));
create policy "organisers delete their film stops" on public.film_stops for delete
  to authenticated using (private.is_team_organiser(team_id));

alter table public.player_status drop constraint if exists player_status_state_check;
alter table public.player_status add constraint player_status_state_check
  check (state in ('idle', 'playing', 'paused', 'survey', 'stopped'));
alter table public.player_status add column if not exists stopped_at real;

create or replace function public.submit_film_surveys(p_token text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
  n integer;
begin
  select id into tid from teams where player_token = p_token and length(p_token) >= 20;
  if tid is null then return -1; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then return 0; end if;
  insert into film_survey_responses (team_id, client_id, film, version, language, impact, answered_at, laptop)
  select tid,
         left(r->>'id', 80),
         left(trim(r->>'film'), 200),
         nullif(left(trim(coalesce(r->>'version', '')), 200), ''),
         nullif(left(trim(coalesce(r->>'language', '')), 40), ''),
         case when (r->>'impact') ~ '^([0-9]|10)$' then (r->>'impact')::smallint end,
         least((r->>'at')::timestamptz, now()),
         nullif(left(trim(coalesce(r->>'laptop', '')), 40), '')
  from jsonb_array_elements(p_rows) r
  where coalesce((r->>'stop')::boolean, false) = false
    and char_length(coalesce(r->>'id', '')) between 8 and 80
    and char_length(trim(coalesce(r->>'film', ''))) between 1 and 200
    and (r->>'at') ~ '^\d{4}-\d{2}-\d{2}T'
  on conflict (client_id) do nothing;
  -- "Stop" presses during a film.
  insert into film_stops (team_id, client_id, film, version, language, stopped_at, duration, stopped_on, laptop)
  select tid,
         left(r->>'id', 80),
         left(trim(r->>'film'), 200),
         nullif(left(trim(coalesce(r->>'version', '')), 200), ''),
         nullif(left(trim(coalesce(r->>'language', '')), 40), ''),
         case when (r->>'stopped_at') ~ '^\d+(\.\d+)?$' then (r->>'stopped_at')::real end,
         case when (r->>'duration') ~ '^\d+(\.\d+)?$' then (r->>'duration')::real end,
         least((r->>'at')::timestamptz, now()),
         nullif(left(trim(coalesce(r->>'laptop', '')), 40), '')
  from jsonb_array_elements(p_rows) r
  where coalesce((r->>'stop')::boolean, false)
    and char_length(coalesce(r->>'id', '')) between 8 and 80
    and char_length(trim(coalesce(r->>'film', ''))) between 1 and 200
    and (r->>'at') ~ '^\d{4}-\d{2}-\d{2}T'
  on conflict (client_id) do nothing;
  select (select count(*) from film_survey_responses
          where team_id = tid and client_id in (select r->>'id' from jsonb_array_elements(p_rows) r))
       + (select count(*) from film_stops
          where team_id = tid and client_id in (select r->>'id' from jsonb_array_elements(p_rows) r))
    into n;
  return n;
end $$;

drop function if exists public.set_player_status(text, text, text, text, text, text, real, real, smallint);
create or replace function public.set_player_status(
  p_token text, p_device text, p_laptop text, p_state text,
  p_film text, p_language text, p_seconds_left real, p_duration real default null,
  p_viewers smallint default null, p_stopped_at real default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  select id into tid from teams where player_token = p_token and length(p_token) >= 20;
  if tid is null or p_state not in ('idle', 'playing', 'paused', 'survey', 'stopped')
     or char_length(coalesce(p_device, '')) not between 8 and 80 then
    return false;
  end if;
  insert into player_status (team_id, device_id, laptop, state, film, language, seconds_left, duration, viewers, stopped_at, ends_at, updated_at)
  values (tid, p_device, coalesce(nullif(left(trim(p_laptop), 40), ''), 'Laptop'), p_state,
          left(p_film, 200), left(p_language, 40), p_seconds_left, p_duration,
          case when p_viewers >= 1 then p_viewers end,
          p_stopped_at,
          case when p_state = 'playing' and p_seconds_left is not null
               then now() + make_interval(secs => greatest(p_seconds_left, 0)) end,
          now())
  on conflict (team_id, device_id) do update set
    laptop = excluded.laptop, state = excluded.state, film = excluded.film,
    language = excluded.language, seconds_left = excluded.seconds_left,
    duration = excluded.duration, viewers = excluded.viewers, stopped_at = excluded.stopped_at,
    ends_at = excluded.ends_at, updated_at = excluded.updated_at;
  return true;
end $$;
grant execute on function public.set_player_status(text, text, text, text, text, text, real, real, smallint, real) to anon, authenticated;

create or replace function public.live_players(p_team_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'now', now(),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'device', device_id, 'laptop', laptop, 'state', state, 'film', film,
        'language', language, 'seconds_left', seconds_left, 'duration', duration,
        'viewers', viewers, 'stopped_at', stopped_at, 'ends_at', ends_at,
        'updated_at', updated_at) order by laptop)
      from player_status
      where team_id = p_team_id and updated_at > now() - interval '30 minutes'), '[]'::jsonb))
  where private.is_team_organiser(p_team_id);
$$;
