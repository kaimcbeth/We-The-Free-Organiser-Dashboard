-- Prize guide photos (Kai, 4 Nov 2026): kept with the equipment photos
-- (same table and bucket, keys "prize:<id>"), uploaded by RSLs and God like
-- equipment. Core Team see the prize guide too, so anyone signed in can read
-- the prize ones.
create policy "signed in read prize photos" on public.equipment_photos
  for select to authenticated
  using (photo_key like 'prize:%');
