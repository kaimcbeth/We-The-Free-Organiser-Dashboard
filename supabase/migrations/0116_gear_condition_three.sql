-- (Applied as gear_condition_three.) Gear condition is now good / fair /
-- needs replacing.
alter table gear_items drop constraint gear_items_condition_check;
update gear_items set condition = case condition
  when 'new' then 'good' when 'worn' then 'fair'
  when 'needs_repair' then 'needs_replacing' when 'broken' then 'needs_replacing'
  else condition end
where condition is not null;
alter table gear_items add constraint gear_items_condition_check
  check (condition in ('good', 'fair', 'needs_replacing'));
