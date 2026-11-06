-- Tech check is done at the event (Kai, 6 Nov 2026: "Tech check should be
-- during event"). Same timing as Equipment set up: shows 6 hours before the
-- start, due an hour after it, so Choose actions and the ranking treat it as
-- During event (part of the event time).
update task_kinds set appear_hours = -6, due_after_hours = 1 where kind = 'ev_tech_check';
