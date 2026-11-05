-- More suggested special events (Kai, 5 Nov 2026): World Vegan Day social,
-- community anniversary, World Day for Laboratory Animals, Melbourne Cup
-- (Australian communities only).
--
-- Anniversary: each community's own start date (teams.founded_on, set by
-- organisers from the suggestion card). special_events.anniversary = true
-- makes the date come from the team, not the event.
-- countries: optional list matched against the country in the team name
-- ("Sydney, Australia" -> Australia).

alter table teams add column if not exists founded_on date;
alter table special_events add column if not exists anniversary boolean not null default false;
alter table special_events add column if not exists countries text[];
alter table special_events drop constraint if exists special_events_check;
alter table special_events add constraint special_events_check
  check ((month is not null and day is not null)
      or (month is not null and week_of_month is not null and weekday is not null)
      or next_date is not null or easter_offset is not null or anniversary);

-- Country from a team name ("Sydney, Australia" -> "Australia").
create or replace function private.team_country(p_name text)
returns text language sql immutable set search_path = public as $$
  select nullif(trim(regexp_replace(coalesce(p_name, ''), '^.*,', '')), '');
$$;

-- Next date of a special event for one team (anniversaries use the team's
-- start date; 29 Feb falls back to 28 Feb in other years).
create or replace function private.team_special_date(e special_events, p_team_id uuid, p_today date)
returns date language sql stable set search_path = public as $$
  select case when e.anniversary then (
      select case when f >= p_today then f else (t.founded_on + make_interval(years => extract(year from p_today)::int + 1 - extract(year from t.founded_on)::int))::date end
      from teams t,
           lateral (select (t.founded_on + make_interval(years => extract(year from p_today)::int - extract(year from t.founded_on)::int))::date f) x
      where t.id = p_team_id and t.founded_on is not null)
    else private.special_event_date(e, p_today) end;
$$;

-- Generic words never identify a special event in a title.
create or replace function private.special_event_words(p_name text)
returns text[] language sql immutable set search_path = public as $$
  select coalesce(array_agg(w), '{}') from regexp_split_to_table(lower(p_name), '[^a-z0-9]+') w
  where length(w) >= 4 and w not in ('movie', 'challenge', 'social', 'party', 'event', 'events',
                                     'night', 'dinner', 'picnic', 'with', 'your', 'the',
                                     'world', 'vegan', 'animal', 'animals', 'rights', 'international',
                                     'community', 'outreach', 'melbourne', 'sydney', 'potluck');
$$;

create or replace function private.guess_special_event(p_team_id uuid, p_title text, p_starts timestamptz)
returns uuid language sql stable security definer set search_path = public as $$
  select s.id from special_events s, teams t
  where t.id = p_team_id
    and (s.region_ids is null or t.region_id = any (s.region_ids))
    and (s.countries is null or private.team_country(t.name) = any (s.countries))
    and abs((p_starts at time zone coalesce(t.timezone, 'Australia/Sydney'))::date
            - private.team_special_date(s, t.id, (p_starts at time zone coalesce(t.timezone, 'Australia/Sydney'))::date - 21)) <= 21
    and exists (select 1 from unnest(private.special_event_words(s.name)) w
                where lower(p_title) ~ ('\m' || w || '\M'))
  limit 1;
$$;

-- Organisers set when their community started.
create or replace function public.set_team_founded_on(p_team_id uuid, p_date date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then raise exception 'Not allowed'; end if;
  if p_date > current_date then raise exception 'That date is in the future'; end if;
  update teams set founded_on = p_date where id = p_team_id;
end $$;
grant execute on function public.set_team_founded_on(uuid, date) to authenticated;

create or replace function public.suggested_events(p_team_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_team teams;
  v_today date;
  v jsonb;
begin
  if not private.is_team_organiser(p_team_id) then return '[]'::jsonb; end if;
  select * into v_team from teams where id = p_team_id;
  if not v_team.suggest_events then return '[]'::jsonb; end if;
  v_today := (now() at time zone coalesce(v_team.timezone, 'Australia/Sydney'))::date;
  with s as (
    select e.*, private.team_special_date(e, p_team_id, v_today) as on_date,
           (e.anniversary and v_team.founded_on is null) as needs_date
    from special_events e
    where (e.region_ids is null or v_team.region_id = any (e.region_ids))
      and (e.countries is null or private.team_country(v_team.name) = any (e.countries))
  ), y as (
    select s.*, coalesce(extract(year from s.on_date)::int, extract(year from v_today)::int) as yr from s
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', y.id, 'name', y.name, 'emoji', y.emoji, 'blurb', y.blurb, 'link', y.link,
      'date', y.on_date, 'days', y.on_date - v_today, 'year', y.yr,
      'needs_date', y.needs_date,
      'years_old', case when y.anniversary and y.on_date is not null
                        then y.yr - extract(year from v_team.founded_on)::int end,
      'planning', r.status = 'planning',
      'region', (select name from regions where id = v_team.region_id),
      'region_count', (select count(*) from special_event_responses x join teams t on t.id = x.team_id
                        where x.special_event_id = y.id and x.year = y.yr
                          and x.status = 'planning' and t.region_id = v_team.region_id),
      'world_count', (select count(*) from special_event_responses x
                       where x.special_event_id = y.id and x.year = y.yr
                         and x.status = 'planning')
    ) order by y.on_date nulls last), '[]'::jsonb) into v
  from y
  left join special_event_responses r on r.team_id = p_team_id
    and r.special_event_id = y.id and r.year = y.yr
  where (y.needs_date or (y.on_date is not null and v_today >= y.on_date - y.lead_days))
    and coalesce(r.status, '') not in ('hidden', 'later');
  return v;
end $$;

create or replace function public.plan_special_event_later(p_team_id uuid, p_event_id uuid, p_year integer, p_show_from timestamp with time zone)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_e special_events;
  v_tz text;
  v_on date;
  v_kind text := 'special_' || md5(p_team_id::text || p_event_id::text || p_year::text);
  v_due timestamptz;
begin
  if not private.is_team_organiser(p_team_id) then return 'not allowed'; end if;
  select * into v_e from special_events where id = p_event_id;
  if not found then return 'missing'; end if;
  select coalesce(timezone, 'Australia/Sydney') into v_tz from teams where id = p_team_id;
  v_on := private.team_special_date(v_e, p_team_id, make_date(p_year, 1, 1));
  if v_on is null then return 'no date'; end if;
  v_due := least(p_show_from + interval '3 days', (v_on::timestamp + time '09:00') at time zone v_tz);
  insert into task_kinds (kind, title, description, estimate_minutes, due_after_hours, schedule, sort_order,
                          team_id, created_by, default_enabled)
  values (v_kind, left('Plan your ' || v_e.name, 80),
          concat_ws(' ', v_e.blurb, 'It''s on ' || to_char(v_on, 'FMDay FMDD Mon') || '. Create it on activism.wtf: https://mystats.wtf/events/new'),
          15, 72, 'special', 1, p_team_id, auth.uid(), false)
  on conflict (kind) do update set title = excluded.title, description = excluded.description;
  delete from tasks where team_id = p_team_id and kind = v_kind and done_at is null;
  insert into tasks (team_id, kind, show_from, due_at)
  values (p_team_id, v_kind, p_show_from, greatest(v_due, p_show_from));
  insert into special_event_responses (team_id, special_event_id, year, status)
  values (p_team_id, p_event_id, p_year, 'later')
  on conflict (team_id, special_event_id, year)
  do update set status = 'later', by_user = auth.uid(), at = now();
  return 'ok';
end $$;

insert into special_events (name, blurb, emoji, month, day, lead_days)
select 'World Vegan Day Social',
       '1 November is World Vegan Day, and the start of World Vegan Month. Celebrate with a big social: a potluck or picnic, a proper welcome for newer members and a cheer for everyone who''s gone vegan this year. A good one to bring curious friends to.',
       '🌱', 11, 1, 61
where not exists (select 1 from special_events where name = 'World Vegan Day Social');

insert into special_events (name, blurb, emoji, anniversary, lead_days)
select 'Community Anniversary',
       'Your community''s birthday. Mark it with a Movie Challenge or outreach day, then a social: look back on the year with a photo recap and your impact numbers, and thank everyone who made it happen.',
       '🎂', true, 42
where not exists (select 1 from special_events where name = 'Community Anniversary');

insert into special_events (name, blurb, emoji, month, day, lead_days)
select 'World Day for Laboratory Animals',
       '24 April is for the animals used in testing and research. Run a vigil, info stall or Movie Challenge, and share easy cruelty-free swaps for cosmetics and cleaning products.',
       '🐁', 4, 24, 61
where not exists (select 1 from special_events where name = 'World Day for Laboratory Animals');

insert into special_events (name, blurb, emoji, month, week_of_month, weekday, lead_days, countries,
                            region_ids)
select 'Melbourne Cup',
       'Cup Day (the first Tuesday in November) puts horse racing in the spotlight: a good day to talk about injuries, deaths on the track and what happens to horses who stop winning. Run outreach somewhere busy, or a picnic as an alternative to the races.',
       '🐎', 11, 1, 2, 61, array['Australia'],
       (select array_agg(id) from regions where name ilike 'oceania%')
where not exists (select 1 from special_events where name = 'Melbourne Cup');

-- Kai: "Put in 12/12 for the $12 Krispy Kremes for outreach" (Australia).
insert into special_events (name, blurb, emoji, month, day, lead_days, countries, region_ids)
select '12/12 Krispy Kreme Movie Challenge',
       'On 12 December Krispy Kreme does a dozen doughnuts for $12, so it''s the cheapest day of the year to stock up on treats. Run a Movie Challenge or outreach day and give a doughnut to everyone who watches (check the deal is on near you and which doughnuts are vegan).',
       '🍩', 12, 12, 61, array['Australia'], (select array_agg(id) from regions where name = 'Oceania')
where not exists (select 1 from special_events where name ilike '%krispy%');
