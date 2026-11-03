-- No more "Maybe" anywhere (Kai, 4 Nov 2026: "I hate people sitting on the
-- fence for events"). RSVPs are Going or Can't. The one Maybe ever given (an
-- upcoming event) is cleared so that person is asked again; Maybe reminders go.

delete from public.event_rsvps where status = 'maybe';
alter table public.event_rsvps drop constraint if exists event_rsvps_status_check;
alter table public.event_rsvps add constraint event_rsvps_status_check check (status in ('going', 'no'));

create or replace function public.set_my_rsvp(p_event_id uuid, p_status text)
returns text
language plpgsql security definer set search_path to 'public' as $$
declare v_person uuid;
begin
  select p.id into v_person from people p join events e on e.team_id = p.team_id
  where p.user_id = auth.uid() and e.id = p_event_id and e.starts_at > now() - interval '6 hours';
  if v_person is null then return 'not_allowed'; end if;
  if p_status is null or p_status = '' then
    delete from event_rsvps where event_id = p_event_id and person_id = v_person;
  elsif p_status in ('going', 'no') then
    insert into event_rsvps (event_id, person_id, status) values (p_event_id, v_person, p_status)
    on conflict (event_id, person_id) do update
      set status = excluded.status, updated_at = now(),
          reminded_at = case when event_rsvps.status = excluded.status then event_rsvps.reminded_at end;
  else return 'bad_status';
  end if;
  return 'ok';
end $$;

update public.people set remind_maybe = false where remind_maybe;

-- Reminder settings without Maybe.
drop function if exists public.set_my_reminders(boolean, boolean, text);
drop function if exists public.set_my_reminder_prefs(text, boolean, boolean, boolean, text);
drop function if exists public.set_my_reminder_prefs(text, boolean, boolean, boolean, text[]);
create or replace function public.set_my_reminder_prefs(
  p_channel text, p_going boolean, p_upcoming boolean, p_kinds text[]
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_channel not in ('none', 'email', 'push') then raise exception 'unknown channel'; end if;
  update people
     set notify_channel = p_channel, remind_going = p_going, remind_maybe = false,
         remind_upcoming = p_upcoming, remind_kinds = p_kinds, remind_category = 'all'
   where user_id = auth.uid();
  return found;
end $$;
revoke all on function public.set_my_reminder_prefs(text, boolean, boolean, text[]) from public, anon;
grant execute on function public.set_my_reminder_prefs(text, boolean, boolean, text[]) to authenticated;

create or replace function public.my_reminder_settings()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'notify_channel', p.notify_channel,
    'has_email', p.email is not null and p.email <> '',
    'going', p.remind_going,
    'upcoming', p.remind_upcoming,
    'kinds', p.remind_kinds)
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
         p.first_name, p.user_id, p.email, p.notify_channel
    from ev
    join event_rsvps r on r.event_id = ev.id
    join people p on p.id = r.person_id
   where r.status = 'going' and r.reminded_at is null and p.remind_going
     and ev.starts_at <= now() + interval '30 hours'
     and (p.remind_kinds is null or ev.ekind = any(p.remind_kinds))
  union all
  select 'upcoming', ev.id, p.id, ev.title, ev.starts_at, ev.venue, ev.address, ev.timezone,
         p.first_name, p.user_id, p.email, p.notify_channel
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
