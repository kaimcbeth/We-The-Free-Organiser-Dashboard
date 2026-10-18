-- "Social" event type renamed to "Community Event". Events already tagged keep
-- the type (it's the same row), and the import now tags socials with it.
update event_types set name = 'Community Event' where name = 'Social';
