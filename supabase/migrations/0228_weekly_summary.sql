-- Monday email summary for organisers (Kai, 12 Nov 2026, idea 7).
-- weekly-summary Edge Function (cron hourly) sends one email per organiser
-- per week from 7 am Monday in the community's timezone.

alter table public.people add column if not exists weekly_summary boolean not null default true;

create table if not exists public.weekly_summary_sent (
  user_id uuid not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  week_start date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, team_id, week_start)
);
alter table public.weekly_summary_sent enable row level security;

-- One row per organiser (and a God account's own community) whose summary is
-- due: Monday from 7 am local, not sent this week, has an email, not switched
-- off. p_force = ignore the day and the sent list (for the test).
create or replace function public.weekly_summaries_due(p_force boolean default false)
returns table (user_id uuid, email text, first_name text, team_id uuid, team_name text,
               timezone text, week_start date, summary jsonb)
language sql stable security definer
set search_path = public
as $$
  with orgs as (
    select o.id uid, o.email, coalesce(o.team_id, o.organiser_team_id) tid
    from organisers o
    where o.access in ('organiser', 'god') and coalesce(o.team_id, o.organiser_team_id) is not null
  ),
  base as (
    select g.uid, coalesce(p.email, g.email) email,
      coalesce(p.first_name, split_part(g.email, '@', 1)) first_name,
      t.id tid, t.name team_name, coalesce(t.timezone, 'Australia/Sydney') tz,
      (now() at time zone coalesce(t.timezone, 'Australia/Sydney')) lnow
    from orgs g
    join teams t on t.id = g.tid
    left join people p on p.user_id = g.uid
    where not t.is_example and not t.is_practice
      and coalesce(p.weekly_summary, true)
      and coalesce(p.is_test, false) = false
  ),
  due as (
    select b.*, (b.lnow::date - (extract(isodow from b.lnow)::int - 1)) wk
    from base b
    where b.email is not null
      and (p_force or (extract(isodow from b.lnow) = 1 and extract(hour from b.lnow) >= 7))
  )
  select d.uid, d.email, d.first_name, d.tid, d.team_name, d.tz, d.wk,
    jsonb_build_object(
      'last', (
        select jsonb_build_object(
          'events', count(distinct e.id),
          'checkins', count(a.person_id),
          'films', (select count(*) from film_survey_responses f where f.team_id = d.tid
                    and (f.answered_at at time zone d.tz)::date between d.wk - 7 and d.wk - 1))
        from events e left join attendance a on a.event_id = e.id
        where e.team_id = d.tid and not coalesce(e.time_unknown, false)
          and (e.starts_at at time zone d.tz)::date between d.wk - 7 and d.wk - 1),
      'newcomers', coalesce((
        select jsonb_agg(x.first_name order by x.first_name) from (
          select distinct on (a.person_id) a.person_id, e.team_id, e.starts_at, p.first_name, p.is_test, p.attended_before_app
          from attendance a join events e on e.id = a.event_id join people p on p.id = a.person_id
          order by a.person_id, e.starts_at) x
        where x.team_id = d.tid and not x.is_test and not x.attended_before_app
          and (x.starts_at at time zone d.tz)::date between d.wk - 7 and d.wk - 1), '[]'),
      'coming', coalesce((
        select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at,
          'going', (select count(*) from event_rsvps r where r.event_id = e.id and r.status = 'going'))
          order by e.starts_at)
        from events e
        where e.team_id = d.tid and not coalesce(e.time_unknown, false)
          and (e.starts_at at time zone d.tz)::date between d.wk and d.wk + 6), '[]'),
      'overdue', (select count(*) from tasks k where k.team_id = d.tid and k.done_at is null
          and k.dismissed_at is null and k.kind <> 'pod_boost' and k.due_at < now()),
      'due', (select count(*) from tasks k where k.team_id = d.tid and k.done_at is null
          and k.dismissed_at is null and k.kind <> 'pod_boost' and k.due_at >= now()
          and (k.due_at at time zone d.tz)::date <= d.wk + 6
          and (k.show_from is null or k.show_from <= now() + interval '7 days')),
      'birthdays', coalesce((
        select jsonb_agg(p.first_name order by make_date(2000, p.birth_month, p.birth_day))
        from people p
        where p.team_id = d.tid and not p.is_test and p.birth_month is not null and p.birth_day is not null
          and exists (select 1 from generate_series(0, 6) i
                      where extract(month from d.wk + i) = p.birth_month
                        and extract(day from d.wk + i) = p.birth_day)), '[]')
    )
  from due d
  where p_force or not exists (select 1 from weekly_summary_sent s
    where s.user_id = d.uid and s.team_id = d.tid and s.week_start = d.wk);
$$;
revoke all on function public.weekly_summaries_due(boolean) from public, anon, authenticated;
grant execute on function public.weekly_summaries_due(boolean) to service_role;

-- The organiser's own on/off switch.
create or replace function public.set_weekly_summary(p_on boolean)
returns void language sql security definer set search_path = public as $$
  update people set weekly_summary = p_on where user_id = auth.uid();
$$;
create or replace function public.my_weekly_summary()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select weekly_summary from people where user_id = auth.uid() limit 1), true);
$$;
revoke all on function public.set_weekly_summary(boolean) from public, anon;
revoke all on function public.my_weekly_summary() from public, anon;
grant execute on function public.set_weekly_summary(boolean) to authenticated;
grant execute on function public.my_weekly_summary() to authenticated;
