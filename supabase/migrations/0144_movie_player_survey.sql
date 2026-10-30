-- Movie player (Resources): an offline player for Movie Challenge laptops.
-- After each film the viewer answers one question ("How much did viewing this
-- video impact you?", 0-10, or skips). Answers are kept on the laptop and sent up
-- when it's next online, using the community's player token baked into the
-- downloaded player file. client_id makes resending harmless. A menu tile can
-- hold several versions of a film; the player picks one at random (kept even).

alter table public.teams
  add column if not exists player_token text not null
  default replace(gen_random_uuid()::text, '-', '');

create table if not exists public.film_survey_responses (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  client_id text not null unique check (char_length(client_id) between 8 and 80),
  film text not null check (char_length(film) between 1 and 200), -- the menu tile (Standard, Halal...)
  version text check (char_length(version) <= 200), -- the video file played (A/B tests)
  impact smallint check (impact between 0 and 10), -- null: skipped
  answered_at timestamptz not null,
  laptop text check (char_length(laptop) <= 40),
  created_at timestamptz not null default now()
);
create index if not exists film_survey_responses_team_idx
  on public.film_survey_responses (team_id, answered_at desc);
alter table public.film_survey_responses enable row level security;
create policy "organisers read their film survey answers" on public.film_survey_responses for select
  to authenticated using (private.is_team_organiser(team_id));

-- Called by the player (no login). Returns how many rows it now holds of the
-- ones sent (new or already there), or -1 for a bad token.
create or replace function public.submit_film_surveys(p_token text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
  n integer;
begin
  select id into tid from teams where player_token = p_token and length(p_token) >= 20;
  if tid is null then return -1; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then return 0; end if;
  insert into film_survey_responses (team_id, client_id, film, version, impact, answered_at, laptop)
  select tid,
         left(r->>'id', 80),
         left(trim(r->>'film'), 200),
         nullif(left(trim(coalesce(r->>'version', '')), 200), ''),
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
grant execute on function public.submit_film_surveys(text, jsonb) to anon, authenticated;

-- The community's player token (organisers), for the download.
create or replace function public.team_player_token(p_team_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select player_token from teams where id = p_team_id and private.is_team_organiser(p_team_id);
$$;
revoke execute on function public.team_player_token(uuid) from public, anon;
grant execute on function public.team_player_token(uuid) to authenticated;
