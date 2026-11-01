-- Battery on the live screen (Kai, 2 Nov 2026): the movie player reports the
-- laptop's battery level and whether it's charging (where the browser allows
-- it); the live laptop cards show it and warn when it's low. Older players
-- don't send these, so they stay null.

alter table player_status
  add column if not exists battery smallint,
  add column if not exists charging boolean;

drop function if exists public.set_player_status(text, text, text, text, text, text, real, real, smallint, real);

create function public.set_player_status(p_token text, p_device text, p_laptop text, p_state text,
  p_film text, p_language text, p_seconds_left real, p_duration real default null,
  p_viewers smallint default null, p_stopped_at real default null,
  p_battery smallint default null, p_charging boolean default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare tid uuid;
begin
  select id into tid from teams where player_token = p_token and length(p_token) >= 20;
  if tid is null or p_state not in ('idle', 'playing', 'paused', 'survey', 'stopped', 'problem')
     or char_length(coalesce(p_device, '')) not between 8 and 80 then
    return false;
  end if;
  insert into player_status (team_id, device_id, laptop, state, film, language, seconds_left, duration,
                             viewers, stopped_at, ends_at, battery, charging, updated_at)
  values (tid, p_device, coalesce(nullif(left(trim(p_laptop), 40), ''), 'Laptop'), p_state,
          left(p_film, 200), left(p_language, 40), p_seconds_left, p_duration,
          case when p_viewers >= 1 then p_viewers end,
          p_stopped_at,
          case when p_state = 'playing' and p_seconds_left is not null
               then now() + make_interval(secs => greatest(p_seconds_left, 0)) end,
          case when p_battery between 0 and 100 then p_battery end,
          p_charging,
          now())
  on conflict (team_id, device_id) do update set
    laptop = excluded.laptop, state = excluded.state, film = excluded.film,
    language = excluded.language, seconds_left = excluded.seconds_left,
    duration = excluded.duration, viewers = excluded.viewers, stopped_at = excluded.stopped_at,
    ends_at = excluded.ends_at, battery = excluded.battery, charging = excluded.charging,
    updated_at = excluded.updated_at;
  return true;
end $$;

grant execute on function public.set_player_status(text, text, text, text, text, text, real, real, smallint, real, smallint, boolean) to anon, authenticated;

create or replace function public.live_players(p_team_id uuid)
returns jsonb
language sql
stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'now', now(),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'device', device_id, 'laptop', laptop, 'state', state, 'film', film,
        'language', language, 'seconds_left', seconds_left, 'duration', duration,
        'viewers', viewers, 'stopped_at', stopped_at, 'ends_at', ends_at,
        'battery', battery, 'charging', charging,
        'updated_at', updated_at) order by laptop)
      from player_status
      where team_id = p_team_id and updated_at > now() - interval '30 minutes'), '[]'::jsonb))
  where private.is_team_core(p_team_id) or private.is_team_member(p_team_id);
$$;

create or replace function public.my_live_players()
returns jsonb
language sql
stable security definer
set search_path = public
as $$
  with mine as (
    select team_id from people where user_id = auth.uid() and team_id is not null
    union select team_id from organisers where id = auth.uid() and team_id is not null
    union select organiser_team_id from organisers where id = auth.uid() and organiser_team_id is not null
  )
  select jsonb_build_object(
    'now', now(),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'device', device_id, 'laptop', laptop, 'state', state, 'film', film,
        'language', language, 'seconds_left', seconds_left, 'duration', duration,
        'viewers', viewers, 'stopped_at', stopped_at, 'ends_at', ends_at,
        'battery', battery, 'charging', charging,
        'updated_at', updated_at) order by laptop)
      from player_status
      where team_id in (select team_id from mine) and updated_at > now() - interval '30 minutes'), '[]'::jsonb))
  where auth.uid() is not null;
$$;
