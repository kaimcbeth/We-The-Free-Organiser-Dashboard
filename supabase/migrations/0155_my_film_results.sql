-- Members (and Core Team) see the same Movie Challenge results as organisers
-- on their Events page while laptops are running: every answer's film,
-- version, language, score, time and laptop (no names; answers are
-- anonymous), and tapouts. Read-only.
create or replace function public.my_film_results()
returns jsonb language sql stable security definer set search_path = public as $$
  with mine as (
    select team_id from people where user_id = auth.uid() and team_id is not null
    union select team_id from organisers where id = auth.uid() and team_id is not null
    union select organiser_team_id from organisers where id = auth.uid() and organiser_team_id is not null
  )
  select jsonb_build_object(
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'film', film, 'version', version,
        'language', language, 'impact', impact, 'answered_at', answered_at, 'laptop', laptop)
        order by answered_at desc)
      from (select * from film_survey_responses
            where team_id in (select team_id from mine)
            order by answered_at desc limit 20000) r), '[]'::jsonb),
    'stops', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'film', film, 'version', version,
        'language', language, 'stopped_at', stopped_at, 'duration', duration,
        'stopped_on', stopped_on, 'laptop', laptop) order by stopped_on desc)
      from (select * from film_stops
            where team_id in (select team_id from mine)
            order by stopped_on desc limit 20000) s), '[]'::jsonb))
  where auth.uid() is not null;
$$;
revoke execute on function public.my_film_results() from public, anon;
grant execute on function public.my_film_results() to authenticated;
