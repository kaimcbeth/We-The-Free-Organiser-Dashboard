-- (Applied as photo_tag_community_no_promo_off.) Photo tags: add community
-- (community events). "Not for promo" is gone from the app, so clear it on
-- any photos that had it.
alter table public.event_photos drop constraint event_photos_tags_check;
alter table public.event_photos add constraint event_photos_tags_check
  check (tags <@ array['outreach', 'group', 'volunteers', 'watching', 'community']::text[]);
update public.event_photos set no_promo = false where no_promo;
