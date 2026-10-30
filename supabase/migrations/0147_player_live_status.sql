-- Movie player live screen: each laptop (online) reports what it's doing, so
-- the organiser's phone can show each film's progress and alert ~10 s before
-- it ends. One row per laptop (device_id is random, kept by the player).
create table if not exists public.player_status (
  team_id uuid not null references teams(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 80),
  laptop text not null check (char_length(laptop) between 1 and 40),
  state text not null check (state in ('idle', 'playing', 'paused', 'survey')),
  film text check (char_length(film) <= 200),
  language text check (char_length(language) <= 40),
  seconds_left real,
  duration real, -- the film's length, for the progress bar
  viewers smallint, -- how many are watching (headphone splitters)
  ends_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (team_id, device_id)
);
alter table public.player_status enable row level security;
create policy "organisers read their players" on public.player_status for select
  to authenticated using (private.is_team_organiser(team_id));

create or replace function public.set_player_status(
  p_token text, p_device text, p_laptop text, p_state text,
  p_film text, p_language text, p_seconds_left real, p_duration real default null,
  p_viewers smallint default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  select id into tid from teams where player_token = p_token and length(p_token) >= 20;
  if tid is null or p_state not in ('idle', 'playing', 'paused', 'survey')
     or char_length(coalesce(p_device, '')) not between 8 and 80 then
    return false;
  end if;
  insert into player_status (team_id, device_id, laptop, state, film, language, seconds_left, duration, viewers, ends_at, updated_at)
  values (tid, p_device, coalesce(nullif(left(trim(p_laptop), 40), ''), 'Laptop'), p_state,
          left(p_film, 200), left(p_language, 40), p_seconds_left, p_duration,
          case when p_viewers >= 1 then p_viewers end,
          case when p_state = 'playing' and p_seconds_left is not null
               then now() + make_interval(secs => greatest(p_seconds_left, 0)) end,
          now())
  on conflict (team_id, device_id) do update set
    laptop = excluded.laptop, state = excluded.state, film = excluded.film,
    language = excluded.language, seconds_left = excluded.seconds_left,
    duration = excluded.duration, viewers = excluded.viewers,
    ends_at = excluded.ends_at, updated_at = excluded.updated_at;
  return true;
end $$;
grant execute on function public.set_player_status(text, text, text, text, text, text, real, real, smallint) to anon, authenticated;

-- The phone's live screen: this community's players, with the server's clock
-- (so countdowns don't depend on the phone's clock being right).
create or replace function public.live_players(p_team_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'now', now(),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'device', device_id, 'laptop', laptop, 'state', state, 'film', film,
        'language', language, 'seconds_left', seconds_left, 'duration', duration,
        'viewers', viewers, 'ends_at', ends_at, 'updated_at', updated_at) order by laptop)
      from player_status
      where team_id = p_team_id and updated_at > now() - interval '30 minutes'), '[]'::jsonb))
  where private.is_team_organiser(p_team_id);
$$;
revoke execute on function public.live_players(uuid) from public, anon;
grant execute on function public.live_players(uuid) to authenticated;
