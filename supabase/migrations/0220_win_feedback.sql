-- "Not our vibe" on Find wins (Kai, 11 Nov 2026: "very subtle, to select that
-- the win wasn't really what they vibe and it learns"). One row per win an
-- organiser or RSL marked; write-copy (purpose "wins") reads the latest ones
-- (service role) as examples to avoid, and never shows those links again.
create table if not exists public.win_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  team_id uuid references teams (id) on delete set null,
  region_id uuid references regions (id) on delete set null,
  headline text not null check (length(headline) <= 300),
  url text check (length(url) <= 1000),
  kind text,
  created_at timestamptz not null default now()
);
create index if not exists win_feedback_created on public.win_feedback (created_at desc);
alter table public.win_feedback enable row level security;
create policy "own win feedback read" on public.win_feedback for select to authenticated using (user_id = auth.uid());
create policy "own win feedback add" on public.win_feedback for insert to authenticated with check (user_id = auth.uid());
create policy "own win feedback remove" on public.win_feedback for delete to authenticated using (user_id = auth.uid());
