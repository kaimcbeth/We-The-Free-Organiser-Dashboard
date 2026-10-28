-- (Applied as photo_tag_watching.) Photo tags: add watching (people watching
-- the footage).
alter table public.event_photos drop constraint event_photos_tags_check;
alter table public.event_photos add constraint event_photos_tags_check
  check (tags <@ array['outreach', 'group', 'volunteers', 'watching']::text[]);
