-- (Applied as gear_details.) Gear: optional model, where it's from (a link or
-- a shop), and condition.
alter table gear_items
  add column model text check (char_length(model) <= 100),
  add column source text check (char_length(source) <= 500),
  add column condition text check (condition in ('new', 'good', 'worn', 'needs_repair', 'broken'));
