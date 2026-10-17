-- We The Free Organiser Dashboard: initial database setup (Phase 1)
--
-- How to run: in Supabase, open SQL Editor, paste this whole file, click Run.
-- It creates the tables, the access rules, and the starting data
-- (the Sydney team and the four event types).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- A WTF city team. Sydney is the first; others can be added later.
create table teams (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  activism_team_url  text,
  timezone           text not null default 'Australia/Sydney',
  created_at         timestamptz not null default now()
);

-- People who can log in and run events. Linked to a Supabase login.
create table organisers (
  id          uuid primary key references auth.users (id) on delete cascade,
  team_id     uuid not null references teams (id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'organiser' check (role in ('organiser', 'admin')),
  created_at  timestamptz not null default now()
);

-- Event categories. counts_as_outreach drives the outreach milestones.
create table event_types (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,
  counts_as_outreach  boolean not null default false,
  sort_order          int not null default 0
);

-- Attendees. They don't need a login; user_id is filled in only if they
-- create an attendee account later (Phase 2).
create table people (
  id                       uuid primary key default gen_random_uuid(),
  team_id                  uuid not null references teams (id) on delete cascade,
  first_name               text not null,
  last_name                text,
  email                    text,
  phone                    text,
  suburb                   text,
  consent_marketing        boolean not null default false,
  consent_given_at         timestamptz,
  added_via                text not null default 'host' check (added_via in ('host', 'self_signup')),
  user_id                  uuid unique references auth.users (id) on delete set null,
  starting_outreach_count  int not null default 0 check (starting_outreach_count >= 0),
  created_at               timestamptz not null default now()
);

create index people_team_idx on people (team_id);
create index people_name_idx on people (team_id, lower(first_name), lower(last_name));
create unique index people_team_email_idx on people (team_id, lower(email)) where email is not null;

-- Events, either imported from activism.wtf or added by hand.
create table events (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references teams (id) on delete cascade,
  event_type_id  uuid references event_types (id) on delete set null,
  title          text not null,
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  venue          text,
  address        text,
  description    text,
  image_url      text,
  source_url     text unique,  -- the activism.wtf link; stops duplicates on import
  source         text not null default 'manual' check (source in ('manual', 'imported')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index events_team_starts_idx on events (team_id, starts_at desc);

-- One row per person per event: the tick.
create table attendance (
  event_id       uuid not null references events (id) on delete cascade,
  person_id      uuid not null references people (id) on delete cascade,
  checked_in_by  uuid references organisers (id) on delete set null,
  checked_in_at  timestamptz not null default now(),
  primary key (event_id, person_id)
);

create index attendance_person_idx on attendance (person_id);

-- ---------------------------------------------------------------------------
-- Access rules (row-level security)
-- Organisers see only their own team's data. Attendees (Phase 2) will see
-- only their own profile and history.
-- ---------------------------------------------------------------------------

create or replace function is_team_organiser(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organisers
    where id = auth.uid() and team_id = p_team_id
  );
$$;

alter table teams       enable row level security;
alter table organisers  enable row level security;
alter table event_types enable row level security;
alter table people      enable row level security;
alter table events      enable row level security;
alter table attendance  enable row level security;

-- Teams: organisers can see their own team.
create policy "organisers read own team" on teams
  for select to authenticated using (is_team_organiser(id));

-- Organisers: can see everyone on their own team.
create policy "organisers read team organisers" on organisers
  for select to authenticated using (is_team_organiser(team_id));

-- Event types: any signed-in user can read them.
create policy "signed-in users read event types" on event_types
  for select to authenticated using (true);

-- People: organisers manage their team's people.
create policy "organisers manage team people" on people
  for all to authenticated
  using (is_team_organiser(team_id))
  with check (is_team_organiser(team_id));

-- People: attendees can read and update their own profile.
create policy "attendees read own profile" on people
  for select to authenticated using (user_id = auth.uid());
create policy "attendees update own profile" on people
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Events: organisers manage their team's events.
create policy "organisers manage team events" on events
  for all to authenticated
  using (is_team_organiser(team_id))
  with check (is_team_organiser(team_id));

-- Events: attendees can read events they attended.
create policy "attendees read attended events" on events
  for select to authenticated using (
    exists (
      select 1 from attendance a join people p on p.id = a.person_id
      where a.event_id = events.id and p.user_id = auth.uid()
    )
  );

-- Attendance: organisers manage check-ins for their team's events.
create policy "organisers manage team attendance" on attendance
  for all to authenticated
  using (exists (select 1 from events e where e.id = event_id and is_team_organiser(e.team_id)))
  with check (exists (select 1 from events e where e.id = event_id and is_team_organiser(e.team_id)));

-- Attendance: attendees can read their own check-ins.
create policy "attendees read own attendance" on attendance
  for select to authenticated using (
    exists (select 1 from people p where p.id = person_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Starting data
-- ---------------------------------------------------------------------------

insert into teams (name, slug, activism_team_url)
values ('Sydney, Australia', 'sydney-au', 'https://activism.wtf/teams/sydney-au');

insert into event_types (name, counts_as_outreach, sort_order) values
  ('Movie Challenge',    true,  1),
  ('Other Outreach',     true,  2),
  ('Social',             false, 3),
  ('Workshop/Training',  false, 4);
