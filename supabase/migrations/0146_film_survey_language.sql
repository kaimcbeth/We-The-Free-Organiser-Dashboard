-- Movie player: language dubs. Each answer records the language of the video
-- played (null = English, from players made before this).
alter table public.film_survey_responses add column if not exists language text check (char_length(language) <= 40);

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
  where char_length(coalesce(r->>'id', '')) between 8 and 80
    and char_length(trim(coalesce(r->>'film', ''))) between 1 and 200
    and (r->>'at') ~ '^\d{4}-\d{2}-\d{2}T'
  on conflict (client_id) do nothing;
  select count(*) into n from film_survey_responses
  where team_id = tid and client_id in (select r->>'id' from jsonb_array_elements(p_rows) r);
  return n;
end $$;
