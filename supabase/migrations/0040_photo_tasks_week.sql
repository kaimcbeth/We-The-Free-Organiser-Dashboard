-- Facebook and Instagram photo posts can wait up to a week after the event.
update task_kinds set due_after_hours = 168
  where kind in ('post_photos_facebook', 'post_photos_instagram');
update tasks t set due_at = coalesce(e.ends_at, e.starts_at) + interval '168 hours'
  from events e
  where e.id = t.event_id and t.kind in ('post_photos_facebook', 'post_photos_instagram')
    and t.done_at is null and t.dismissed_at is null;
