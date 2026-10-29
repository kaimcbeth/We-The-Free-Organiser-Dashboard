-- (Applied as photo_event_kind.) What kind of event a photo is from (e.g.
-- Potluck, Social, Movie Challenge), picked from the kinds in the community's
-- event listings.
alter table public.event_photos add column event_kind text check (char_length(event_kind) <= 40);
