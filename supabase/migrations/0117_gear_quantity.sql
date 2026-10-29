-- (Applied as gear_quantity.) How many of a piece of gear the community has
-- (e.g. 4 pairs of headphones).
alter table gear_items add column quantity int not null default 1 check (quantity between 1 and 999);
