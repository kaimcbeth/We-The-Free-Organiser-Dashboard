-- Public Build Your Kit demo (Kai, 11 Nov 2026: "a demoable version … a link
-- that I can send to my operations director"). /demo/build-your-kit needs no
-- login, so visitors who aren't signed in can read the equipment order and the
-- equipment photos (product photos; the bucket is already public). Prize
-- photos stay signed-in only.
drop policy if exists "anyone reads equipment order" on public.equipment_order;
create policy "anyone reads equipment order" on public.equipment_order
  for select to anon using (true);
drop policy if exists "anyone reads equipment photos" on public.equipment_photos;
create policy "anyone reads equipment photos" on public.equipment_photos
  for select to anon using (photo_key not like 'prize:%');
