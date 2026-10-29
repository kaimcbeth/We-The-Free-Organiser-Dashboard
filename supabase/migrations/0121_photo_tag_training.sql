-- (Applied as photo_tag_training.) Photo tags: add training.
alter table public.event_photos drop constraint event_photos_tags_check;
alter table public.event_photos add constraint event_photos_tags_check
  check (tags <@ array['outreach', 'group', 'volunteers', 'watching', 'community', 'sign', 'training']::text[]);
