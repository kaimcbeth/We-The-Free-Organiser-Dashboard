-- Photo Hub thumbnails (Kai, 12 Nov 2026: "the photo hub is quite slow to load,
-- especially on mobile"). The grid showed full-size photos (Sydney: 193
-- photos, ~106 MB). A small copy (480 px, ~40 KB) is stored next to each one
-- at <team>/library/thumb-<id>-<n>.jpg; the browser makes it at upload, or the
-- first time an organiser opens the hub. Null = not made yet (or the photo was
-- cropped since), so the full photo is shown.
alter table public.event_photos add column if not exists thumb_path text;
