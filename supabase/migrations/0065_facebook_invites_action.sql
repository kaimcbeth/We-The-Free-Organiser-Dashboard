-- (Applied as facebook_invites_action.) New action for every event:
-- "Facebook event invites sent", a week before, due two days before, gone
-- once the event starts. Also: user-facing "task" wording in assign_task,
-- create_event_tasks, create_monthly_tasks and choose_core_tasks now says
-- "action" (patched in place).
insert into public.task_kinds (kind, title, blurb, description, estimate_minutes, estimate_max_minutes,
  anchor, appear_hours, due_after_hours, sort_order, audience, schedule, core_role, expire_anchor, expire_after_hours)
values ('facebook_invites', 'Facebook event invites sent', 'Invite friends and local members',
  'Invites to the Facebook event have gone out to friends and local members, so it shows up in their notifications.',
  5, 10, 'start', -168, -48, 0, 'community', 'event', 'promo_lead', 'start', 0);
