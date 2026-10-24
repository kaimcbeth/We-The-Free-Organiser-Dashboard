-- Order on the day: photos, attendance, stories, pack-down, debrief, then
-- the photo posts.
update task_kinds set sort_order = 8 where kind = 'ev_packdown';
update task_kinds set sort_order = 9 where kind = 'ev_debrief';
