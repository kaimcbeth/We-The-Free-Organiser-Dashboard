-- (Applied as gear_photo.) A photo for a piece of the community's gear
-- (private bucket event-photos/<team>/gear/<id>.jpg, so only that community
-- sees it).
alter table gear_items add column photo_path text check (char_length(photo_path) <= 300);
