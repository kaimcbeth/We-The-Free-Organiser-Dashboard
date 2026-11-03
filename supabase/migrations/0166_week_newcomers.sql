-- Weekly newcomer report (Kai, 4 Nov 2026): everyone whose first event ever
-- was one of this community's events in a Monday–Sunday week (team timezone).
-- Each organiser closes the week's card for themselves.

create table if not exists public.newcomer_report_dismissals (
  team_id uuid not null references public.teams (id) on delete cascade,
  week_start date not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (team_id, week_start, user_id)
);
alter table public.newcomer_report_dismissals enable row level security;
create policy "own newcomer report dismissals" on public.newcomer_report_dismissals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, delete on public.newcomer_report_dismissals to authenticated;

create or replace function public.week_newcomers(p_team_id uuid, p_week_start date)
returns table (person_id uuid, first_name text, last_name text, event_title text, event_starts_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  with t as (select coalesce(timezone, 'Australia/Sydney') tz from teams where id = p_team_id),
  firsts as (
    select distinct on (a.person_id) a.person_id, e.id event_id, e.team_id, e.title, e.starts_at
    from attendance a join events e on e.id = a.event_id
    order by a.person_id, e.starts_at
  )
  select p.id, p.first_name, p.last_name, f.title, f.starts_at
  from firsts f join people p on p.id = f.person_id, t
  where private.is_team_organiser(p_team_id)
    and f.team_id = p_team_id
    and not p.is_test and not p.attended_before_app
    and (f.starts_at at time zone t.tz)::date between p_week_start and p_week_start + 6
  order by f.starts_at, p.first_name;
$$;
revoke all on function public.week_newcomers(uuid, date) from public, anon;
grant execute on function public.week_newcomers(uuid, date) to authenticated;
