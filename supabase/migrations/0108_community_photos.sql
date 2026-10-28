-- (Applied as community_photos.) Community photos: photos not tied to an
-- event (older ones from before the app), with a rough date (year, optional
-- month) and an optional note. Stored at event-photos/<team>/library/<id>.jpg.
-- They're promo photos like any other, so graphics pick them up automatically.
alter table public.event_photos alter column event_id drop not null;
alter table public.event_photos
  add column taken_year int check (taken_year between 2000 and 2100),
  add column taken_month int check (taken_month between 1 and 12),
  add column caption text check (char_length(caption) <= 120),
  add constraint event_photos_month_needs_year check (taken_month is null or taken_year is not null);

drop policy "core team adds event photos" on public.event_photos;
create policy "core team adds event photos" on public.event_photos for insert to authenticated
  with check (
    private.is_team_core(team_id)
    and (event_id is null
         or exists (select 1 from events e where e.id = event_photos.event_id and e.team_id = event_photos.team_id))
  );

create index event_photos_library_idx on public.event_photos (team_id, taken_year desc, taken_month desc)
  where event_id is null;
