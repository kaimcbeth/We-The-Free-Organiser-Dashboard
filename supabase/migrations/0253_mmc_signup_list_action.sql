-- Kai, 25 Nov 2026: "Can we make an action attached to movie challenges for it?" (the sign-up list graphic).
-- Movie Challenge events only (same event type as prizes_purchased); shows 10 days before, due 4 days before,
-- gone at the start. The card's "Make the sign-up list" button opens SignupListMaker (task-card.tsx).
insert into task_kinds (kind, title, blurb, description, estimate_minutes, estimate_max_minutes,
  anchor, appear_hours, due_after_hours, expire_anchor, expire_after_hours, sort_order,
  event_type_id, audience, core_role, schedule, default_enabled, importance, tier)
select 'mmc_signup_list', 'Sign-up list posted',
  'Movie Challenges only: a numbered list for people to grab a spot',
  'A sign-up list for the Movie Challenge is up in the community chat: numbered spots with blanks, so people can reply to grab one. Add names as they come in and share it again to fill the last spots.',
  5, 10, 'start', -240, -96, 'start', 0, 5,
  'f9e22281-b750-43c0-86c3-395bf1539f5c', 'community', 'events_lead', 'event', true,
  (select importance from task_kinds where kind = 'prizes_purchased') + 1, 2
where not exists (select 1 from task_kinds where kind = 'mmc_signup_list');
