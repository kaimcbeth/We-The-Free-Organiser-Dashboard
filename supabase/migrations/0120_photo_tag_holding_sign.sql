-- (Applied as photo_tag_holding_sign.) Photo tags: add sign (someone holding
-- a sign).
alter table public.event_photos drop constraint event_photos_tags_check;
alter table public.event_photos add constraint event_photos_tags_check
  check (tags <@ array['outreach', 'group', 'volunteers', 'watching', 'community', 'sign']::text[]);
