-- Special events (Halloween Movie Challenge, Christmas social...): suggested
-- to organisers a while before the date. God sets them for anywhere; Regional
-- Support Leads have full control over ones just for their region.
create table if not exists public.special_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  blurb text,
  link text,
  month int check (month between 1 and 12),   -- same date every year...
  day int check (day between 1 and 31),
  next_date date,                             -- ...or a date set each year
  lead_days int not null default 42 check (lead_days between 1 and 180),
  region_ids uuid[],                          -- null = worldwide
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check ((month is not null and day is not null) or next_date is not null)
);
alter table public.special_events enable row level security;

create or replace function private.can_edit_special_event(p_region_ids uuid[])
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_god() or exists (
    select 1 from organisers o where o.id = auth.uid()
      and o.access = 'regional_lead' and o.region_id is not null
      and p_region_ids = array[o.region_id]);
$$;
revoke execute on function private.can_edit_special_event(uuid[]) from public, anon;
grant execute on function private.can_edit_special_event(uuid[]) to authenticated;

create policy "staff see special events" on public.special_events for select
  to authenticated using (private.is_staff());
create policy "god and leads add special events" on public.special_events for insert
  to authenticated with check (private.can_edit_special_event(region_ids));
create policy "god and leads change special events" on public.special_events for update
  to authenticated using (private.can_edit_special_event(region_ids))
  with check (private.can_edit_special_event(region_ids));
create policy "god and leads remove special events" on public.special_events for delete
  to authenticated using (private.can_edit_special_event(region_ids));

-- What each team did with a suggestion this year: on board, or hidden
-- (hidden ones come back next year).
create table if not exists public.special_event_responses (
  team_id uuid not null references teams(id) on delete cascade,
  special_event_id uuid not null references special_events(id) on delete cascade,
  year int not null,
  status text not null check (status in ('planning', 'hidden')),
  by_user uuid default auth.uid(),
  at timestamptz not null default now(),
  primary key (team_id, special_event_id, year)
);
alter table public.special_event_responses enable row level security;

alter table public.teams add column if not exists suggest_events boolean not null default true;
alter table public.teams add column if not exists suggest_events_chosen_at timestamptz;

-- Next date a special event falls on, on or after p_today.
create or replace function private.special_event_date(e special_events, p_today date)
returns date language sql immutable as $$
  select case
    when e.month is not null then
      case when make_date(extract(year from p_today)::int, e.month, least(e.day, 28 + (e.month <> 2)::int * 2 + (e.month in (1,3,5,7,8,10,12))::int)) >= p_today
        then make_date(extract(year from p_today)::int, e.month, least(e.day, 28 + (e.month <> 2)::int * 2 + (e.month in (1,3,5,7,8,10,12))::int))
        else make_date(extract(year from p_today)::int + 1, e.month, least(e.day, 28 + (e.month <> 2)::int * 2 + (e.month in (1,3,5,7,8,10,12))::int)) end
    when e.next_date >= p_today then e.next_date
  end;
$$;

-- Suggestions showing for a team now (unless they've switched them off).
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
    select e.*, private.special_event_date(e, v_today) as on_date
    from special_events e
    where e.region_ids is null or v_team.region_id = any (e.region_ids)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'blurb', s.blurb, 'link', s.link,
      'date', s.on_date, 'days', s.on_date - v_today, 'year', extract(year from s.on_date)::int,
      'planning', r.status = 'planning',
      'region', (select name from regions where id = v_team.region_id),
      'region_count', (select count(*) from special_event_responses x join teams t on t.id = x.team_id
                        where x.special_event_id = s.id and x.year = extract(year from s.on_date)
                          and x.status = 'planning' and t.region_id = v_team.region_id),
      'world_count', (select count(*) from special_event_responses x
                       where x.special_event_id = s.id and x.year = extract(year from s.on_date)
                         and x.status = 'planning')
    ) order by s.on_date), '[]'::jsonb) into v
  from s
  left join special_event_responses r on r.team_id = p_team_id
    and r.special_event_id = s.id and r.year = extract(year from s.on_date)
  where s.on_date is not null
    and v_today >= s.on_date - s.lead_days
    and coalesce(r.status, '') <> 'hidden';
  return v;
end $$;

create or replace function public.respond_special_event(p_team_id uuid, p_event_id uuid, p_year int, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then raise exception 'Not allowed'; end if;
  if p_status is null then
    delete from special_event_responses where team_id = p_team_id and special_event_id = p_event_id and year = p_year;
  elsif p_status in ('planning', 'hidden') then
    insert into special_event_responses (team_id, special_event_id, year, status)
    values (p_team_id, p_event_id, p_year, p_status)
    on conflict (team_id, special_event_id, year)
    do update set status = excluded.status, by_user = auth.uid(), at = now();
  end if;
end $$;

create or replace function public.set_suggest_events(p_team_id uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then raise exception 'Not allowed'; end if;
  update teams set suggest_events = p_on, suggest_events_chosen_at = now() where id = p_team_id;
end $$;

-- Who's on board with each special event this year (for the manage page).
create or replace function public.special_event_teams(p_event_id uuid, p_year int)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not private.is_regional_staff() then '[]'::jsonb else
    coalesce((select jsonb_agg(t.name order by t.name) from special_event_responses r
      join teams t on t.id = r.team_id
      where r.special_event_id = p_event_id and r.year = p_year and r.status = 'planning'), '[]'::jsonb) end;
$$;

create or replace function public.team_setup_status(p_team_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when not private.is_team_core(p_team_id) then null else json_build_object(
    'whatsapp', (select whatsapp_url is not null from teams where id = p_team_id),
    'events', exists (select 1 from events where team_id = p_team_id and starts_at > now()),
    'actions', exists (select 1 from team_task_kinds where team_id = p_team_id),
    'core_team', exists (select 1 from organisers where team_id = p_team_id and access = 'core_team')
              or exists (select 1 from people where pending_role = 'core_team'
                         and coalesce(pending_team_id, team_id) = p_team_id),
    'suggestions', (select suggest_events_chosen_at is not null from teams where id = p_team_id),
    'dismissed', (select setup_dismissed_at is not null from teams where id = p_team_id)
  ) end;
$$;

revoke execute on function public.suggested_events(uuid), public.respond_special_event(uuid, uuid, int, text),
  public.set_suggest_events(uuid, boolean), public.special_event_teams(uuid, int) from public, anon;
grant execute on function public.suggested_events(uuid), public.respond_special_event(uuid, uuid, int, text),
  public.set_suggest_events(uuid, boolean), public.special_event_teams(uuid, int) to authenticated;

insert into special_events (name, blurb, month, day, lead_days, created_by)
select * from (values
  ('Halloween Movie Challenge',
   'Run a 3 Minute Movie Challenge with a Halloween twist: costumes, spooky signs, and a chance to talk about the real horror animals face.',
   10, 31, 42, null::uuid),
  ('Christmas social',
   'Wrap up the year with a social (potluck, picnic or dinner) to thank your volunteers and welcome newer faces.',
   12, 13, 35, null::uuid)
) v
where not exists (select 1 from special_events);
