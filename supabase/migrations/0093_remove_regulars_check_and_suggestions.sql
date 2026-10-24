-- "Regulars list checked": removed.
update task_kinds set archived_at = now() where kind = 'com_regulars';
update tasks set dismissed_at = now() where kind = 'com_regulars' and done_at is null and dismissed_at is null;
update task_owners set ended_at = now() where kind = 'com_regulars' and ended_at is null;

-- Feature suggestions from the What's new page. Everyone sees their own; God sees all.
create table feature_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text,
  team_id uuid references teams(id) on delete set null,
  body text not null check (char_length(body) between 5 and 2000),
  created_at timestamptz not null default now()
);
alter table feature_suggestions enable row level security;
create policy "suggest: add own" on feature_suggestions for insert to authenticated
  with check (user_id = auth.uid());
create policy "suggest: read own or god" on feature_suggestions for select to authenticated
  using (user_id = auth.uid() or private.is_god());
create policy "suggest: delete own or god" on feature_suggestions for delete to authenticated
  using (user_id = auth.uid() or private.is_god());
