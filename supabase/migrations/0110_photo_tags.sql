-- (Applied as photo_tags.) Photo tags: outreach, group (group photo),
-- volunteers. Any photo can have any mix of them.
alter table public.event_photos
  add column tags text[] not null default '{}'
  check (tags <@ array['outreach', 'group', 'volunteers']::text[]);
create index event_photos_tags_idx on public.event_photos using gin (tags);
