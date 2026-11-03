-- Reminders, simpler (Kai, 4 Nov 2026): one Email reminders on/off switch
-- (on = everything, off = nothing), with an optional fine-tune of toggle
-- buttons: which reminders (going / maybe / all upcoming) and which types
-- (outreach / community). The type choice now also covers Going reminders.

alter table public.people
  add column if not exists remind_going boolean not null default true;

create or replace function public.set_my_reminder_prefs(
  p_channel text, p_going boolean, p_maybe boolean, p_upcoming boolean, p_category text
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_channel not in ('none', 'email', 'push') then raise exception 'unknown channel'; end if;
  if p_category not in ('all', 'outreach', 'community') then raise exception 'unknown category'; end if;
  update people
     set notify_channel = p_channel, remind_going = p_going, remind_maybe = p_maybe,
         remind_upcoming = p_upcoming, remind_category = p_category
   where user_id = auth.uid();
  return found;
end $$;
revoke all on function public.set_my_reminder_prefs(text, boolean, boolean, boolean, text) from public, anon;
grant execute on function public.set_my_reminder_prefs(text, boolean, boolean, boolean, text) to authenticated;

create or replace function public.my_reminder_settings()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'notify_channel', p.notify_channel,
    'has_email', p.email is not null and p.email <> '',
    'going', p.remind_going,
    'maybe', p.remind_maybe,
    'upcoming', p.remind_upcoming,
    'category', p.remind_category)
  from people p
  where p.user_id = auth.uid()
  order by p.created_at
  limit 1
$$;

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
     and (p.remind_category = 'all' or ev.category = p.remind_category)
     and ((r.status = 'going' and p.remind_going)
          or (r.status = 'maybe' and p.remind_maybe))
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
