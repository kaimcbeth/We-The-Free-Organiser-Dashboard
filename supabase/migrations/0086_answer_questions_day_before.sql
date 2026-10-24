-- Questions answered on event posts: due the day before the event.
update task_kinds set due_after_hours = -24 where kind = 'promo_answer_questions';
update tasks t set due_at = e.starts_at - interval '24 hours' from events e
where t.event_id = e.id and t.kind = 'promo_answer_questions' and t.done_at is null and t.dismissed_at is null;

-- ...and it only shows up the day before (36 hours ahead).
update task_kinds set appear_hours = -36, due_after_hours = -24 where kind = 'promo_answer_questions';
update tasks t set show_from = e.starts_at - interval '36 hours' from events e
where t.event_id = e.id and t.kind = 'promo_answer_questions' and t.done_at is null and t.dismissed_at is null
  and e.starts_at - interval '36 hours' > now();
