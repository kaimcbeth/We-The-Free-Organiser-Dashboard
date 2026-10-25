-- (Applied as rsvps.) Volunteers say they're coming (Going / Maybe / Can't).
-- Organisers see who's coming; people who said Going get a reminder the day
-- before (in the app, plus email or a phone notification if they chose one).
create table event_rsvps (
  event_id uuid not null references events(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  reminded_at timestamptz,
  primary key (event_id, person_id)
);
create index event_rsvps_person_idx on event_rsvps (person_id);
alter table event_rsvps enable row level security;
create policy "core team read rsvps" on event_rsvps for select to authenticated
  using (private.is_team_core((select team_id from events e where e.id = event_id)));
create policy "members read own rsvps" on event_rsvps for select to authenticated
  using (private.is_my_person(person_id));

-- Upcoming events in my community (next 6 weeks) with my answer and how many are going.
create function public.my_upcoming_events()
returns table (id uuid, title text, starts_at timestamptz, ends_at timestamptz, venue text,
               address text, type text, source_url text, my_status text, going int)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.starts_at, e.ends_at, e.venue, e.address, et.name, e.source_url,
         r.status,
         (select count(*)::int from event_rsvps g where g.event_id = e.id and g.status = 'going')
  from people me
  join events e on e.team_id = me.team_id
  left join event_types et on et.id = e.event_type_id
  left join event_rsvps r on r.event_id = e.id and r.person_id = me.id
  where me.user_id = auth.uid()
    and e.starts_at > now() and e.starts_at < now() + interval '42 days'
  order by e.starts_at;
$$;

create function public.set_my_rsvp(p_event_id uuid, p_status text)
returns text language plpgsql security definer set search_path = public as $$
declare v_person uuid;
begin
  select p.id into v_person from people p join events e on e.team_id = p.team_id
  where p.user_id = auth.uid() and e.id = p_event_id and e.starts_at > now() - interval '6 hours';
  if v_person is null then return 'not_allowed'; end if;
  if p_status is null or p_status = '' then
    delete from event_rsvps where event_id = p_event_id and person_id = v_person;
  elsif p_status in ('going', 'maybe', 'no') then
    insert into event_rsvps (event_id, person_id, status) values (p_event_id, v_person, p_status)
    on conflict (event_id, person_id) do update
      set status = excluded.status, updated_at = now(),
          reminded_at = case when event_rsvps.status = excluded.status then event_rsvps.reminded_at end;
  else return 'bad_status';
  end if;
  return 'ok';
end $$;
revoke execute on function public.my_upcoming_events(), public.set_my_rsvp(uuid, text) from public, anon;
grant execute on function public.my_upcoming_events(), public.set_my_rsvp(uuid, text) to authenticated;

-- Day-before reminders: hourly.
select cron.schedule('event-reminders', '15 * * * *', $$
  select net.http_post(
    url := 'https://jmslxbygvmjtwwxuzkrt.supabase.co/functions/v1/event-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$$);
