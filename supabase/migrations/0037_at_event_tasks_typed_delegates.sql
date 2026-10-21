-- Instagram stories at the event; attendance task is 5 min; "every time"
-- delegation is per kind of task and per event type.
-- (Applied as ig_stories_and_typed_delegates + typed_delegates_fix.)
insert into task_kinds (kind, title, description, estimate_minutes, estimate_max_minutes, anchor, appear_hours, due_after_hours, sort_order) values
  ('instagram_stories', 'Instagram stories posted at the event',
   'A few stories go up on the community''s Instagram while the event is on.', 2, 5, 'start', -1, 5, 7);
update task_kinds set estimate_minutes = 5 where kind = 'take_attendance';

create table task_delegates (
  team_id        uuid not null references teams (id) on delete cascade,
  kind           text not null references task_kinds (kind) on delete cascade,
  event_type_id  uuid references event_types (id) on delete cascade,
  person_id      uuid references people (id) on delete cascade, -- null = stopped
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id) on delete set null
);
create unique index task_delegates_one on task_delegates
  (team_id, kind, coalesce(event_type_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table task_delegates enable row level security;
create policy "organisers read team task delegates" on task_delegates
  for select to authenticated using (private.is_team_organiser(team_id));
-- set_task_delegate(team, kind, event_type, person) upserts; create_event_tasks
-- assigns new tasks to the delegate for that kind + the event's type.
