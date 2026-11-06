-- Kai, 6 Nov 2026:
-- * "Any time you want to reference volunteers, it should say members
--   instead": every live action's title, blurb and description, and the
--   Christmas social suggestion.

-- (Prizes purchased stays Movie Challenge only: Kai first said outreach, then
-- clarified it's only for Movie Challenges. Movie Challenge counts as outreach,
-- so the 2:1 mix still applies it to 1 in 3 events in Choose actions.)

create or replace function pg_temp.members(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(t,
    'Volunteers', 'Members'), 'volunteers', 'members'), 'Volunteer', 'Member'), 'volunteer', 'member')
$$;

update task_kinds set
  title = pg_temp.members(title),
  blurb = pg_temp.members(blurb),
  description = pg_temp.members(description)
where title ~* 'volunteer' or blurb ~* 'volunteer' or description ~* 'volunteer';

update special_events set blurb = pg_temp.members(blurb) where blurb ~* 'volunteer';
