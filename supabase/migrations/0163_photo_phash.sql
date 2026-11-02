-- A small fingerprint of each photo (64-bit difference hash, 16 hex chars),
-- worked out in the browser, so the Photo Hub can spot duplicates.
alter table public.event_photos add column if not exists phash text;
comment on column public.event_photos.phash is 'dHash of the photo (16 hex chars), for finding duplicates; null = not worked out yet (or re-cropped)';
