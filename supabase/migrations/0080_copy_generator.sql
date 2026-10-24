-- (Applied as copy_generator.) Social media copy generator.
-- voice_examples: up to 10 past posts per community (20–1,500 characters each)
--   that the generator copies the voice of. Optional.
-- copy_generations: one row per generation, for a daily limit per community.
create table voice_examples (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams (id) on delete cascade,
  platform   text check (platform in ('instagram', 'facebook', 'whatsapp', 'story')),
  body       text not null check (char_length(body) between 20 and 1500),
  added_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index voice_examples_team on voice_examples (team_id, created_at desc);
alter table voice_examples enable row level security;
create policy "core team read voice" on voice_examples
  for select to authenticated using (private.is_team_core(team_id));
create policy "core team add voice" on voice_examples
  for insert to authenticated with check (
    private.is_team_core(team_id)
    and (select count(*) from voice_examples v where v.team_id = voice_examples.team_id) < 10);
create policy "core team remove voice" on voice_examples
  for delete to authenticated using (private.is_team_core(team_id));

create table copy_generations (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams (id) on delete cascade,
  event_id   uuid references events (id) on delete set null,
  user_id    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index copy_generations_team on copy_generations (team_id, created_at desc);
alter table copy_generations enable row level security;
