-- Event recap (Kai, 4 Nov 2026): a card on the Events tab after an event
-- ends: how many came, the first-timers, and the film numbers for that day.
-- Each organiser closes it for themselves.

create table if not exists public.event_recap_dismissals (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_recap_dismissals enable row level security;
create policy "own recap dismissals" on public.event_recap_dismissals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, delete on public.event_recap_dismissals to authenticated;

create or replace function public.event_recap(p_event_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  e events%rowtype;
  tz text;
  d date;
  result jsonb;
begin
  select * into e from events where id = p_event_id;
  if not found or not private.is_team_organiser(e.team_id) then
    return null;
  end if;
  select coalesce(timezone, 'Australia/Sydney') into tz from teams where id = e.team_id;
  d := (e.starts_at at time zone tz)::date;

  select jsonb_build_object(
    'attended', (select count(*) from attendance a join people p on p.id = a.person_id
                 where a.event_id = e.id and not p.is_test),
    'first_timers', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name)
                       order by a.checked_in_at)
      from attendance a join people p on p.id = a.person_id
      where a.event_id = e.id and not p.is_test and not p.attended_before_app
        and not exists (
          select 1 from attendance a2 join events e2 on e2.id = a2.event_id
          where a2.person_id = p.id and e2.id <> e.id and e2.starts_at < e.starts_at)
    ), '[]'::jsonb),
    'watched', (select count(*) from film_survey_responses r
                where r.team_id = e.team_id and (r.answered_at at time zone tz)::date = d),
    'answered', (select count(r.impact) from film_survey_responses r
                 where r.team_id = e.team_id and (r.answered_at at time zone tz)::date = d),
    'impact', (select round(avg(r.impact)::numeric, 1) from film_survey_responses r
               where r.team_id = e.team_id and (r.answered_at at time zone tz)::date = d),
    'tapouts', (select count(*) from film_stops s
                where s.team_id = e.team_id and (s.stopped_on at time zone tz)::date = d)
  ) into result;
  return result;
end;
$$;
revoke all on function public.event_recap(uuid) from public, anon;
grant execute on function public.event_recap(uuid) to authenticated;
