-- (Applied as gear.) A simple gear tracker: each community's kit and who has it.
create table gear_items (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  notes text check (char_length(notes) <= 500),
  holder_person_id uuid references people(id) on delete set null,
  holder_note text check (char_length(holder_note) <= 100), -- "Storage unit", when it's not with a person
  moved_at timestamptz,
  created_at timestamptz not null default now()
);
create index gear_items_team_idx on gear_items (team_id);
alter table gear_items enable row level security;
create policy "core team read gear" on gear_items for select to authenticated using (private.is_team_core(team_id));
create policy "core team add gear" on gear_items for insert to authenticated with check (private.is_team_core(team_id));
create policy "core team change gear" on gear_items for update to authenticated using (private.is_team_core(team_id)) with check (private.is_team_core(team_id));
create policy "core team remove gear" on gear_items for delete to authenticated using (private.is_team_core(team_id));
