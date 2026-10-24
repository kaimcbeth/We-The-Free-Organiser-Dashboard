-- Local Facebook groups promo: comes up 3 days before (the Wednesday for a
-- Saturday event), due by the end of that day.
update task_kinds set appear_hours = -84, due_after_hours = -60 where kind = 'promote_facebook_groups';
update tasks t set due_at = e.starts_at - interval '60 hours',
  show_from = case when e.starts_at - interval '84 hours' > now() then e.starts_at - interval '84 hours' else t.show_from end
from events e
where t.event_id = e.id and t.kind = 'promote_facebook_groups' and t.done_at is null and t.dismissed_at is null and e.starts_at > now();
