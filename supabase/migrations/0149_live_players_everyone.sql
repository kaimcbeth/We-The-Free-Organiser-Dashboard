-- Live screen for everyone in the community: Core Team and members see their
-- own community's movie player laptops while they're running (Events page for
-- members, attendance page for Core Team). Organisers keep live_players(team).
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
  where private.is_team_core(p_team_id) or private.is_team_member(p_team_id);
$$;

create or replace function public.my_live_players()
returns jsonb language sql stable security definer set search_path = public as $$
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
        'updated_at', updated_at) order by laptop)
      from player_status
      where team_id in (select team_id from mine) and updated_at > now() - interval '30 minutes'), '[]'::jsonb))
  where auth.uid() is not null;
$$;
revoke execute on function public.my_live_players() from public, anon;
grant execute on function public.my_live_players() to authenticated;
