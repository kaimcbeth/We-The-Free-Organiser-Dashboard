-- Text message reminders (Kai, 4 Nov 2026, via ClickSend): 'sms' as a
-- reminder channel (uses people.phone). Secrets: CLICKSEND_USER,
-- CLICKSEND_KEY, SMS_FROM (sender name, no spaces, max 11 characters).

alter table public.people drop constraint if exists people_notify_channel_check;
alter table public.people add constraint people_notify_channel_check
  check (notify_channel in ('none', 'email', 'push', 'sms'));

create or replace function public.set_my_reminder_prefs(
  p_channel text, p_going boolean, p_upcoming boolean, p_kinds text[]
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_channel not in ('none', 'email', 'push', 'sms') then raise exception 'unknown channel'; end if;
  update people
     set notify_channel = p_channel, remind_going = p_going, remind_maybe = false,
         remind_upcoming = p_upcoming, remind_kinds = p_kinds, remind_category = 'all'
   where user_id = auth.uid();
  return found;
end $$;

create or replace function public.my_reminder_settings()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'notify_channel', p.notify_channel,
    'has_email', p.email is not null and p.email <> '',
    'has_phone', p.phone is not null and p.phone <> '',
    'going', p.remind_going,
    'upcoming', p.remind_upcoming,
    'kinds', p.remind_kinds)
  from people p
  where p.user_id = auth.uid()
  order by p.created_at
  limit 1
$$;

-- Test texts go only to God accounts' own phones (organisers.role = 'admin').
create or replace function public.sms_test_recipients()
returns table (first_name text, phone text, timezone text)
language sql stable security definer set search_path = public as $$
  select p.first_name, p.phone, coalesce(t.timezone, 'Australia/Sydney')
    from organisers o
    join auth.users u on lower(u.email) = lower(o.email)
    join people p on p.user_id = u.id
    left join teams t on t.id = p.team_id
   where o.role = 'admin' and p.phone is not null and p.phone <> ''
$$;
revoke all on function public.sms_test_recipients() from public, anon, authenticated;
grant execute on function public.sms_test_recipients() to service_role;

-- reminders_due() also needs the person's phone and timezone for texts.
drop function if exists public.reminders_due();
create function public.reminders_due()
returns table (
  kind text, event_id uuid, person_id uuid, title text, starts_at timestamptz,
  venue text, address text, timezone text, first_name text, user_id uuid,
  email text, notify_channel text, phone text
)
language sql stable security definer set search_path = public as $$
  with ev as (
    select e.id, e.team_id, e.title, e.starts_at, e.venue, e.address,
           coalesce(t.timezone, 'Australia/Sydney') as timezone,
           public.event_kind(et.name, e.title) as ekind
      from events e
      join teams t on t.id = e.team_id
      left join event_types et on et.id = e.event_type_id
     where e.starts_at between now() + interval '18 hours' and now() + interval '78 hours'
       and not coalesce(e.time_unknown, false)
       and not t.is_example and not t.is_practice
  )
  select 'going', ev.id, p.id, ev.title, ev.starts_at, ev.venue, ev.address, ev.timezone,
         p.first_name, p.user_id, p.email, p.notify_channel, p.phone
    from ev
    join event_rsvps r on r.event_id = ev.id
    join people p on p.id = r.person_id
   where r.status = 'going' and r.reminded_at is null and p.remind_going
     and ev.starts_at <= now() + interval '30 hours'
     and (p.remind_kinds is null or ev.ekind = any(p.remind_kinds))
  union all
  select 'upcoming', ev.id, p.id, ev.title, ev.starts_at, ev.venue, ev.address, ev.timezone,
         p.first_name, p.user_id, p.email, p.notify_channel, p.phone
    from ev
    join people p on p.team_id = ev.team_id
   where ev.starts_at >= now() + interval '48 hours'
     and p.remind_upcoming and p.user_id is not null and not coalesce(p.is_test, false)
     and (p.remind_kinds is null or ev.ekind = any(p.remind_kinds))
     and not exists (select 1 from event_rsvps r where r.event_id = ev.id and r.person_id = p.id)
     and not exists (select 1 from event_heads_up h where h.event_id = ev.id and h.person_id = p.id)
$$;
revoke all on function public.reminders_due() from public, anon, authenticated;
grant execute on function public.reminders_due() to service_role;
