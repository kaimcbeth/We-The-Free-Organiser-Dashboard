-- A very short line for each task, shown when choosing tasks.
alter table task_kinds add column blurb text;
update task_kinds k set blurb = v.blurb from (values
  ('promote_facebook_groups', 'Share the event in local groups'),
  ('promote_whatsapp', 'Post the event in the community chat'),
  ('promote_instagram', 'A post or story about the event'),
  ('take_attendance', 'Tick everyone in on the day'),
  ('instagram_stories', 'A few stories during the event'),
  ('post_photos', 'Best photos in the community chat'),
  ('post_photos_facebook', 'A few photos on Facebook'),
  ('post_photos_instagram', 'A few photos on Instagram')
) as v(kind, blurb) where k.kind = v.kind;

-- Attendance: from the start of the event until the next day.
-- Instagram stories: on the day or the day after.
update task_kinds set appear_hours = 0, due_after_hours = 24, blurb = 'Tick everyone in, during or after',
  description = 'Everyone who came is ticked in, during or after the event. This ticks itself off once attendance has started.'
where kind = 'take_attendance';
update task_kinds set appear_hours = 0, due_after_hours = 36, title = 'Instagram stories posted',
  blurb = 'Stories on the day or the day after',
  description = 'A few stories go up on the community''s Instagram on the day or the day after.'
where kind = 'instagram_stories';
