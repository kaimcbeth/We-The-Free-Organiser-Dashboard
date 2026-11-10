-- Section introductions (Kai, 7 Nov 2026): one card at the top of each tab,
-- gone once it's finished or closed. Remembered per person, on every device.
create table if not exists public.intro_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  key text not null check (char_length(key) between 1 and 60),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.intro_dismissals enable row level security;
create policy "own intro dismissals read" on public.intro_dismissals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own intro dismissals add" on public.intro_dismissals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own intro dismissals remove" on public.intro_dismissals
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.intro_dismissals to authenticated;
