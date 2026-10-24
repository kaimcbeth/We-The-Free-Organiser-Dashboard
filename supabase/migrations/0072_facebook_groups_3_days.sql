-- Local Facebook groups promo: shows 5 days before, due 3 days before
-- (a Wednesday for a Saturday event), when people plan their weekend.
update public.task_kinds
set appear_hours = -120, due_after_hours = -72
where kind = 'promote_facebook_groups';

update public.tasks t
set due_at = e.starts_at - interval '72 hours'
from public.events e
where t.event_id = e.id
  and t.kind = 'promote_facebook_groups'
  and t.done_at is null and t.dismissed_at is null
  and e.starts_at > now();
