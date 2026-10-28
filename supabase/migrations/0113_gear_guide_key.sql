-- (Applied as gear_guide_key.) Gear added from the equipment guide remembers
-- which guide item it is, so the guide can show what the community has.
alter table gear_items add column guide_key text check (char_length(guide_key) <= 40);
create index gear_items_guide_idx on gear_items (team_id, guide_key) where guide_key is not null;
