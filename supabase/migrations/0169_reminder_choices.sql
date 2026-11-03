-- Reminder choices (Kai, 4 Nov 2026): on top of the day-before reminder for
-- events you're Going to, people can choose
--   * a day-before reminder for events they said Maybe to,
--   * a heads-up about 3 days before for upcoming events they haven't answered,
--   * which events those two cover: all, outreach only, or community only
--     (event_types.category; training and untyped events only under "all").

alter table public.people
  add column if not exists remind_maybe boolean not null default false,
  add column if not exists remind_upcoming boolean not null default false,
  add column if not exists remind_category text not null default 'all'
    check (remind_category in ('all', 'outreach', 'community'));

-- One heads-up per person per event.
create table if not exists public.event_heads_up (
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (event_id, person_id)
);
alter table public.event_heads_up enable row level security; -- service role only

create or replace function public.set_my_reminders(
  p_maybe boolean, p_upcoming boolean, p_category text
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_category not in ('all', 'outreach', 'community') then
    raise exception 'unknown category';
  end if;
  update people
     set remind_maybe = p_maybe, remind_upcoming = p_upcoming, remind_category = p_category
   where user_id = auth.uid();
  return found;
end $$;
revoke all on function public.set_my_reminders(boolean, boolean, text) from public, anon;
grant execute on function public.set_my_reminders(boolean, boolean, text) to authenticated;

-- Everything due right now, for the event-reminders Edge Function (hourly).
--   going:    Going, starts in 18–30 h, not yet reminded
--   maybe:    Maybe, starts in 18–30 h, not yet reminded, person wants Maybe reminders
--   upcoming: no answer, starts in 48–78 h, person wants heads-ups, not sent before
create or replace function public.reminders_due()
returns table (
  kind text, event_id uuid, person_id uuid, title text, starts_at timestamptz,
  venue text, address text, timezone text, first_name text, user_id uuid,
  email text, notify_channel text
)
language sql stable security definer set search_path = public as $$
  with ev as (
    select e.id, e.team_id, e.title, e.starts_at, e.venue, e.address,
           coalesce(t.timezone, 'Australia/Sydney') as timezone, et.category
      from events e
      join teams t on t.id = e.team_id
      left join event_types et on et.id = e.event_type_id
     where e.starts_at between now() + interval '18 hours' and now() + interval '78 hours'
       and not coalesce(e.time_unknown, false)
       and not t.is_example and not t.is_practice
  )
  select case r.status when 'going' then 'going' else 'maybe' end,
         ev.id, p.id, ev.title, ev.starts_at, ev.venue, ev.address, ev.timezone,
         p.first_name, p.user_id, p.email, p.notify_channel
    from ev
    join event_rsvps r on r.event_id = ev.id
    join people p on p.id = r.person_id
   where r.reminded_at is null
     and ev.starts_at <= now() + interval '30 hours'
     and (r.status = 'going'
          or (r.status = 'maybe' and p.remind_maybe
              and (p.remind_category = 'all' or ev.category = p.remind_category)))
  union all
  select 'upcoming', ev.id, p.id, ev.title, ev.starts_at, ev.venue, ev.address, ev.timezone,
         p.first_name, p.user_id, p.email, p.notify_channel
    from ev
    join people p on p.team_id = ev.team_id
   where ev.starts_at >= now() + interval '48 hours'
     and p.remind_upcoming and p.user_id is not null and not coalesce(p.is_test, false)
     and (p.remind_category = 'all' or ev.category = p.remind_category)
     and not exists (select 1 from event_rsvps r where r.event_id = ev.id and r.person_id = p.id)
     and not exists (select 1 from event_heads_up h where h.event_id = ev.id and h.person_id = p.id)
$$;
revoke all on function public.reminders_due() from public, anon, authenticated;
grant execute on function public.reminders_due() to service_role;
