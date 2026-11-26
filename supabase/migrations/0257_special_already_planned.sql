-- "Already planned" on suggested special events (Kai, 26 Nov 2026).
-- New response status 'planned': the card goes away but the community still
-- counts as on board. A card also goes away once one of the community's
-- events is tagged with that special event (within 60 days of its date).

alter table special_event_responses drop constraint special_event_responses_status_check;
alter table special_event_responses add constraint special_event_responses_status_check
  check (status in ('planning', 'hidden', 'later', 'planned'));

create or replace function public.respond_special_event(p_team_id uuid, p_event_id uuid, p_year int, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then raise exception 'Not allowed'; end if;
  if p_status is null then
    delete from special_event_responses where team_id = p_team_id and special_event_id = p_event_id and year = p_year;
  elsif p_status in ('planning', 'hidden', 'planned') then
    insert into special_event_responses (team_id, special_event_id, year, status)
    values (p_team_id, p_event_id, p_year, p_status)
    on conflict (team_id, special_event_id, year)
    do update set status = excluded.status, by_user = auth.uid(), at = now();
  end if;
end $$;

create or replace function public.special_event_teams(p_event_id uuid, p_year integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not private.is_regional_staff() then '[]'::jsonb else
    coalesce((select jsonb_agg(t.name order by t.name) from special_event_responses r
      join teams t on t.id = r.team_id
      where r.special_event_id = p_event_id and r.year = p_year and r.status in ('planning', 'planned')), '[]'::jsonb) end;
$$;

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
      'id', y.id, 'name', replace(y.name, '{year}', y.yr::text), 'emoji', y.emoji, 'blurb', y.blurb, 'link', y.link,
      'date', y.on_date, 'days', y.on_date - v_today, 'year', y.yr,
      'needs_date', y.needs_date,
      'years_old', case when y.anniversary and y.on_date is not null
                        then y.yr - extract(year from v_team.founded_on)::int end,
      'planning', r.status = 'planning',
      'region', (select name from regions where id = v_team.region_id),
      'region_count', (select count(*) from special_event_responses x join teams t on t.id = x.team_id
                        where x.special_event_id = y.id and x.year = y.yr
                          and x.status in ('planning', 'planned') and t.region_id = v_team.region_id),
      'world_count', (select count(*) from special_event_responses x
                       where x.special_event_id = y.id and x.year = y.yr
                         and x.status in ('planning', 'planned'))
    ) order by y.on_date nulls last), '[]'::jsonb) into v
  from y
  left join special_event_responses r on r.team_id = p_team_id
    and r.special_event_id = y.id and r.year = y.yr
  where (y.needs_date or (y.on_date is not null and v_today >= y.on_date - y.lead_days))
    and coalesce(r.status, '') not in ('hidden', 'later', 'planned')
    and not exists (
      select 1 from events ev
      where ev.team_id = p_team_id and ev.special_event_id = y.id
        and y.on_date is not null
        and (ev.starts_at at time zone coalesce(v_team.timezone, 'Australia/Sydney'))::date
            between y.on_date - 60 and y.on_date + 60);
  return v;
end $$;
