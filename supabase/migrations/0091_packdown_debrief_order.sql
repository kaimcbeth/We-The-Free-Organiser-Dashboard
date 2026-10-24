-- Order on the day: photos, attendance, stories, pack-down, debrief, then
-- the photo posts.
update task_kinds set sort_order = 8 where kind = 'ev_packdown';
update task_kinds set sort_order = 9 where kind = 'ev_debrief';

-- After the event: WhatsApp photos (quick), thank-you messages, then the
-- Facebook and Instagram photo posts.
update task_kinds set sort_order = 12 where kind = 'com_thank_you';
update task_kinds set sort_order = 13 where kind = 'post_photos_facebook';
update task_kinds set sort_order = 14 where kind = 'post_photos_instagram';
