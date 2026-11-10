-- Equipment guide order (Kai, 11 Nov 2026: "a panel in god mode where I can
-- change the order of the list of items in the build your kit view").
-- One row per guide item key; items not listed keep their code order after
-- the listed ones. Everyone signed in reads it; only God sets it.

create table if not exists public.equipment_order (
  item_key text primary key,
  position int not null,
  updated_at timestamptz not null default now()
);
alter table public.equipment_order enable row level security;
drop policy if exists "read equipment order" on public.equipment_order;
create policy "read equipment order" on public.equipment_order
  for select to authenticated using (true);

create or replace function public.set_equipment_order(p_keys text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_god() then raise exception 'Not allowed'; end if;
  delete from equipment_order where true;
  insert into equipment_order (item_key, position)
  select k, n from unnest(p_keys) with ordinality as x(k, n);
end $$;
revoke all on function public.set_equipment_order(text[]) from public, anon;
grant execute on function public.set_equipment_order(text[]) to authenticated;
