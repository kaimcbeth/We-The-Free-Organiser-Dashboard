-- "Questions answered on event posts": per event (5 days before, due 2 hours
-- before it starts) instead of weekly.
update task_kinds set schedule = 'event', schedule_weekday = null, anchor = 'start', appear_hours = -120, due_after_hours = -2, expire_anchor = 'start', expire_after_hours = 0,
  blurb = 'Reply to comments and messages about this event',
  description = 'Questions on this event''s Facebook event, posts and listings have been answered.'
where kind = 'promo_answer_questions';
update tasks set dismissed_at = now() where kind = 'promo_answer_questions' and event_id is null and done_at is null and dismissed_at is null;
