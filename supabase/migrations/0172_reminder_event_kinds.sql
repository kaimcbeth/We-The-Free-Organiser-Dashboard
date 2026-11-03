-- Reminder event kinds (Kai, 4 Nov 2026): instead of outreach / community,
-- one toggle per kind of event, worked out from the event type and title
-- (activism.wtf only types Movie Challenge / Other Outreach / Community Event /
-- Co-working / Workshop; potlucks, demos, sanctuary days and hikes are found
-- from the title). people.remind_kinds: null = every kind.

create or replace function public.event_kind(p_type text, p_title text)
returns text language sql immutable as $$
  select case
    when p_type = 'Movie Challenge' or p_title ~* 'movie challenge|3mmc' then 'movie_challenge'
    when p_title ~* 'demonstra|demonstartion|protest|\mmarch\M|rally' then 'demonstration'
    when p_title ~* 'potluck|pot luck|dinner|dîner|meal|picnic|brunch|lunch|bbq' then 'potluck'
    when p_title ~* 'sanctuary|santuario|lebenshof|farm visit' then 'sanctuary'
    when p_title ~* '\mhik(e|ing)\M|bushwalk' then 'hike'
    when p_type = 'Co-working' or p_title ~* 'co-?working' then 'coworking'
    when p_type = 'Workshop/Training' or p_title ~* 'workshop|training|masterclass' then 'workshop'
    when p_type = 'Other Outreach' or p_title ~* '\mstall\M|kiosque|vigil|outreach' then 'outreach'
    when p_type = 'Community Event' or p_title ~* 'social|party|hangout|gathering|quiz' then 'social'
    else 'other'
  end
$$;
grant execute on function public.event_kind(text, text) to authenticated, service_role;

alter table public.people add column if not exists remind_kinds text[];

create or replace function public.set_my_reminder_prefs(
  p_channel text, p_going boolean, p_maybe boolean, p_upcoming boolean, p_kinds text[]
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_channel not in ('none', 'email', 'push') then raise exception 'unknown channel'; end if;
  update people
     set notify_channel = p_channel, remind_going = p_going, remind_maybe = p_maybe,
         remind_upcoming = p_upcoming, remind_kinds = p_kinds, remind_category = 'all'
   where user_id = auth.uid();
  return found;
end $$;
revoke all on function public.set_my_reminder_prefs(text, boolean, boolean, boolean, text[]) from public, anon;
grant execute on function public.set_my_reminder_prefs(text, boolean, boolean, boolean, text[]) to authenticated;

create or replace function public.my_reminder_settings()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'notify_channel', p.notify_channel,
    'has_email', p.email is not null and p.email <> '',
    'going', p.remind_going,
    'maybe', p.remind_maybe,
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
  select case r.status when 'going' then 'going' else 'maybe' end,
         ev.id, p.id, ev.title, ev.starts_at, ev.venue, ev.address, ev.timezone,
         p.first_name, p.user_id, p.email, p.notify_channel
    from ev
    join event_rsvps r on r.event_id = ev.id
    join people p on p.id = r.person_id
   where r.reminded_at is null
     and ev.starts_at <= now() + interval '30 hours'
     and (p.remind_kinds is null or ev.ekind = any(p.remind_kinds))
     and ((r.status = 'going' and p.remind_going)
          or (r.status = 'maybe' and p.remind_maybe))
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

-- Carry over anyone who already narrowed it to outreach / community.
update public.people set remind_kinds = array['movie_challenge', 'outreach', 'demonstration']
 where remind_category = 'outreach' and remind_kinds is null;
update public.people set remind_kinds = array['social', 'potluck', 'coworking']
 where remind_category = 'community' and remind_kinds is null;
