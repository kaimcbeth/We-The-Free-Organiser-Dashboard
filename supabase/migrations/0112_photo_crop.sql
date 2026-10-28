-- (Applied as photo_crop.) Cropping a photo saves the cropped copy as the
-- photo and remembers the original file, so it can be reset.
alter table public.event_photos add column original_path text;
