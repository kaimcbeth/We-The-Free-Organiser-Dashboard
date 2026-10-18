-- Automatic event import from each team's activism.wtf calendar feed
-- (https://activism.wtf/teams/<slug>/events.ics). The import itself is the
-- "import-events" Edge Function (supabase/functions/import-events).

-- The event's permanent ID on activism.wtf, so re-imports update rather than duplicate.
alter table events add column if not exists source_uid text;
create unique index if not exists events_team_source_uid_idx on events (team_id, source_uid) where source_uid is not null;

-- One row per import run, so organisers can see when it last worked.
create table if not exists import_runs (
  id        bigint generated always as identity primary key,
  team_id   uuid references teams (id) on delete cascade,
  ran_at    timestamptz not null default now(),
  ok        boolean not null,
  found     int not null default 0,
  added     int not null default 0,
  updated   int not null default 0,
  message   text
);

create index if not exists import_runs_team_idx on import_runs (team_id, ran_at desc);

alter table import_runs enable row level security;

create policy "organisers read team import runs" on import_runs
  for select to authenticated using (private.is_team_organiser(team_id));
