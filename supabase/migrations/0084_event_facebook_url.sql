-- The event's Facebook event link, pasted once on an action and reused by
-- every Facebook-related action (and Write post).
alter table events add column if not exists facebook_url text;
