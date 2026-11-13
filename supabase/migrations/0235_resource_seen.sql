-- "New" tags on Resources (Kai, 13 Nov 2026: "Any resources that are new
-- that someone hasn't clicked on should have an exciting little new tag").
-- Which resources each person has opened.
create table if not exists public.resource_seen (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.resource_seen enable row level security;
drop policy if exists "own seen resources" on public.resource_seen;
create policy "own seen resources" on public.resource_seen for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.resource_seen to authenticated;
