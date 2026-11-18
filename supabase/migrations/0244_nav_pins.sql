-- Pinned top-bar items (Kai, 19 Nov 2026: "pin different things to the top
-- bar like different parts of the resource hub"). One row per person.
create table if not exists public.nav_pins (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  pins text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint nav_pins_max check (cardinality(pins) <= 6)
);
alter table public.nav_pins enable row level security;
create policy "own nav pins" on public.nav_pins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.nav_pins to authenticated;
