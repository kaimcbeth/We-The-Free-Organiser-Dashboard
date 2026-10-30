-- Movie player: "Video not working?" button. The laptop reports state
-- 'problem' (film paused) and the live screen alerts straight away.
alter table player_status drop constraint player_status_state_check;
alter table player_status add constraint player_status_state_check
  check (state in ('idle', 'playing', 'paused', 'survey', 'stopped', 'problem'));

CREATE OR REPLACE FUNCTION public.set_player_status(p_token text, p_device text, p_laptop text, p_state text, p_film text, p_language text, p_seconds_left real, p_duration real DEFAULT NULL::real, p_viewers smallint DEFAULT NULL::smallint, p_stopped_at real DEFAULT NULL::real)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare tid uuid;
begin
  select id into tid from teams where player_token = p_token and length(p_token) >= 20;
  if tid is null or p_state not in ('idle', 'playing', 'paused', 'survey', 'stopped', 'problem')
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
end $function$;
