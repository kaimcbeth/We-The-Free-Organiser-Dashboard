-- Kai, 6 Nov 2026:
-- * "Prizes purchased only for outreach events": outreach_only instead of
--   Movie Challenge only (Police approval and Equipment set up already were).
-- * "Any time you want to reference volunteers, it should say members
--   instead": every live action's title, blurb and description, and the
--   Christmas social suggestion.

update task_kinds set
  outreach_only = true,
  event_type_id = null,
  blurb = 'Outreach events only, before it starts',
  description = 'Prizes for the outreach event are bought and ready before it starts.'
where kind = 'prizes_purchased';

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
