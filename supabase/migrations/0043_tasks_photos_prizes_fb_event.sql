-- (Applied as facebook_event_task, take_photos_task, event_type_tasks_prizes.)
-- New tasks: "Facebook event created" (before), "Event photos taken" (during),
-- "Prizes purchased" (Movie Challenge events only, due at the start).
-- task_kinds.event_type_id limits a task to one type of event; create_event_tasks
-- now respects it. Communities that already chose their tasks get the new ones off.
alter table task_kinds add column if not exists event_type_id uuid references event_types (id);
