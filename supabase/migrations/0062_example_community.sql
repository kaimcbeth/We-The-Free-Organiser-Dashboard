-- A pretend community shown during the organiser tour, so new organisers see
-- events, people and numbers before their own community has any.
alter table public.teams add column is_example boolean not null default false;

create or replace function private.is_example_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from teams t where t.id = p_team_id and t.is_example);
$$;

-- Anyone with a role (Core Team and up) can look at it; nobody can change it.
create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organisers o where o.id = auth.uid());
$$;

create policy "staff read example team" on public.teams for select
  using (is_example and private.is_staff());
create policy "staff read example events" on public.events for select
  using (private.is_example_team(team_id) and private.is_staff());
create policy "staff read example people" on public.people for select
  using (private.is_example_team(team_id) and private.is_staff() and not is_test);
create policy "staff read example attendance" on public.attendance for select
  using (private.is_example_team(private.event_team(event_id)) and private.is_staff());
create policy "staff read example lead roles" on public.person_core_roles for select
  using (private.is_example_team(team_id) and private.is_staff());
create policy "staff read example tasks" on public.tasks for select
  using (private.is_example_team(team_id) and private.is_staff());

create or replace function public.event_likely_attendees(p_event_id uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not exists (select 1 from events e where e.id = p_event_id
                 and (private.is_team_organiser(e.team_id)
                      or (private.is_example_team(e.team_id) and private.is_staff()))) then
    return '{}'::jsonb;
  end if;
  return private.likely_scores(p_event_id);
end;
$function$;

-- Example events keep their place relative to today (refreshed hourly).
create table private.example_events (
  event_id uuid primary key references public.events(id),
  day_offset int not null,
  start_time time not null,
  hours numeric not null
);

create or replace function private.refresh_example_events() returns void
language sql security definer set search_path = public as $$
  update events e set
    starts_at = ((((now() at time zone t.timezone)::date + x.day_offset) + x.start_time) at time zone t.timezone),
    ends_at = ((((now() at time zone t.timezone)::date + x.day_offset) + x.start_time) at time zone t.timezone) + make_interval(mins => (x.hours * 60)::int)
  from private.example_events x, teams t
  where e.id = x.event_id and t.id = e.team_id;
  update attendance a set checked_in_at = e.starts_at + interval '10 minutes'
  from events e, private.example_events x
  where x.event_id = e.id and a.event_id = e.id;
  -- Their tasks move with them.
  update tasks k set due_at = (case tk.anchor when 'end' then coalesce(e.ends_at, e.starts_at) else e.starts_at end)
      + make_interval(hours => tk.due_after_hours)
  from events e, task_kinds tk, private.example_events x
  where k.event_id = e.id and tk.kind = k.kind and x.event_id = e.id;
$$;

do $$
declare
  t uuid;
  social uuid := (select id from event_types where name = 'Community Event');
  outreach uuid := (select id from event_types where name = 'Other Outreach');
  movie uuid := (select id from event_types where name = 'Movie Challenge');
  john uuid; paul uuid; george uuid; ringo uuid;
  ev uuid; r record;
begin
  insert into teams (name, slug, timezone, is_example)
  values ('Example Community', 'example-community', 'Australia/Sydney', true)
  returning id into t;

  insert into people (team_id, first_name, phone, pending_role, pending_team_id)
    values (t, 'John', '+61 400 000 001', 'organiser', t) returning id into john;
  insert into people (team_id, first_name, phone, pending_role, pending_team_id)
    values (t, 'Paul', '+61 400 000 002', 'core_team', t) returning id into paul;
  insert into people (team_id, first_name, is_buddy)
    values (t, 'George', true) returning id into george;
  insert into people (team_id, first_name)
    values (t, 'Ringo') returning id into ringo;
  insert into person_core_roles (person_id, team_id, core_role) values (paul, t, 'events_lead');

  -- (offset days, start, hours, title, type, venue, who came)
  for r in select * from (values
      (-35, time '18:00', 3, 'Social', social, 'The Vegan Café', array[john, paul]),
      (-28, time '12:00', 3, 'Outreach', outreach, 'Town Hall Square', array[john, paul, george]),
      (-21, time '18:00', 3, 'Social', social, 'The Vegan Café', array[john, paul, george]),
      (-14, time '12:00', 3, 'Outreach', outreach, 'Town Hall Square', array[john, paul]),
      (-7,  time '18:00', 3, 'Social', social, 'The Vegan Café', array[john, paul, george, ringo]),
      (4,   time '18:00', 3, 'Social', social, 'The Vegan Café', array[]::uuid[]),
      (11,  time '12:00', 3, 'Outreach', outreach, 'Town Hall Square', array[]::uuid[]),
      (18,  time '10:00', 8, 'Movie Challenge', movie, 'Community Hall', array[]::uuid[])
    ) v(d, st, h, title, ty, venue, came)
  loop
    insert into events (team_id, event_type_id, title, starts_at, venue, source)
      values (t, r.ty, r.title, now(), r.venue, 'manual') returning id into ev;
    insert into private.example_events values (ev, r.d, r.st, r.h);
    insert into attendance (event_id, person_id, checked_in_at)
      select ev, p, now() from unnest(r.came) p;
  end loop;
  perform private.refresh_example_events();
end $$;

select cron.schedule('refresh-example-events', '3 * * * *', 'select private.refresh_example_events()');

-- (Applied separately as example_buddy_pairing.) George looks after Ringo,
-- so the tour can show New member support on Ringo's profile; the pairing is
-- re-dated by refresh_example_events() to "6 days ago".
create policy "staff read example pairings" on public.buddy_pairings for select
  using (private.is_example_team(team_id) and private.is_staff());
