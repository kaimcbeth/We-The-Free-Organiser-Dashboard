-- Whole-stall count for the movie player's TV screen (Kai, 17 Nov 2026):
-- how many have watched today across every laptop of the community.
create or replace function public.player_today(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  t record;
  res jsonb;
begin
  select id, coalesce(timezone, 'Australia/Sydney') as tz into t
  from teams where player_token = p_token and length(p_token) >= 20;
  if t.id is null then return null; end if;
  select jsonb_build_object(
    'watched', count(*),
    'laptops', count(distinct laptop),
    'impact', round(avg(impact)::numeric, 1)
  ) into res
  from film_survey_responses
  where team_id = t.id
    and (answered_at at time zone t.tz)::date = (now() at time zone t.tz)::date;
  return res;
end $$;
revoke all on function public.player_today(text) from public;
grant execute on function public.player_today(text) to anon, authenticated;
