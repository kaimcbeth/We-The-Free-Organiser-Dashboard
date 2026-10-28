-- (Applied as equipment_photos.) Photos on the equipment guide (one per item,
-- or per option like Budget / Best). Shared by every community; only Regional
-- Support Leads and God can add or change them. Files in the public bucket
-- equipment/<key>/<id>.jpg.
create table public.equipment_photos (
  photo_key text primary key check (char_length(photo_key) <= 60),
  path text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.equipment_photos enable row level security;
create policy "staff read equipment photos" on public.equipment_photos for select to authenticated
  using (private.is_staff());
create policy "regional staff add equipment photos" on public.equipment_photos for insert to authenticated
  with check (private.is_regional_staff());
create policy "regional staff change equipment photos" on public.equipment_photos for update to authenticated
  using (private.is_regional_staff()) with check (private.is_regional_staff());
create policy "regional staff remove equipment photos" on public.equipment_photos for delete to authenticated
  using (private.is_regional_staff());

insert into storage.buckets (id, name, public) values ('equipment', 'equipment', true)
  on conflict (id) do nothing;
create policy "regional staff upload equipment photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'equipment' and private.is_regional_staff());
