-- (Applied as event_type_categories_coworking.) Event types sit in categories
-- (Outreach events / Community events / Training), and Co-working is its own
-- type under Community events, shown by its own name.
alter table event_types add column category text not null default 'community'
  check (category in ('outreach', 'community', 'training'));
update event_types set category = 'outreach' where counts_as_outreach;
update event_types set category = 'training' where name = 'Workshop/Training';
update event_types set sort_order = 5 where name = 'Workshop/Training';
insert into event_types (name, counts_as_outreach, sort_order, category)
select 'Co-working', false, 4, 'community'
where not exists (select 1 from event_types where name = 'Co-working');
