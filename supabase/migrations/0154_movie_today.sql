-- Today's Movie Challenge numbers for everyone in the community (members,
-- Core Team, organisers): views, average impact, tapouts, per film and per
-- laptop. Totals only, no individual answers. Shown under the live laptops.
create or replace function public.my_movie_today()
returns jsonb language sql stable security definer set search_path = public as $$
  with mine as (
    select t.id, t.timezone from teams t
    where t.id = (
      select team_id from people where user_id = auth.uid() and team_id is not null limit 1)
       or t.id in (select team_id from organisers where id = auth.uid() and team_id is not null)
       or t.id in (select organiser_team_id from organisers where id = auth.uid() and organiser_team_id is not null)
  ),
  ans as (
    select r.film, r.impact, r.laptop, r.answered_at
    from film_survey_responses r join mine m on m.id = r.team_id
    where (r.answered_at at time zone m.timezone)::date = (now() at time zone m.timezone)::date
  ),
  st as (
    select s.film from film_stops s join mine m on m.id = s.team_id
    where (s.stopped_on at time zone m.timezone)::date = (now() at time zone m.timezone)::date
  )
  select jsonb_build_object(
    'views', (select count(*) from ans),
    'answered', (select count(impact) from ans),
    'avg', (select round(avg(impact)::numeric, 1) from ans),
    'tapouts', (select count(*) from st),
    'last_at', (select max(answered_at) from ans),
    'films', coalesce((select jsonb_agg(jsonb_build_object('film', film, 'views', v, 'avg', a) order by v desc)
                       from (select film, count(*) v, round(avg(impact)::numeric, 1) a from ans group by film) f), '[]'::jsonb),
    'laptops', coalesce((select jsonb_agg(jsonb_build_object('laptop', l, 'views', v) order by l)
                         from (select coalesce(laptop, 'Laptop') l, count(*) v from ans group by 1) x), '[]'::jsonb))
  where auth.uid() is not null;
$$;
revoke execute on function public.my_movie_today() from public, anon;
grant execute on function public.my_movie_today() to authenticated;
