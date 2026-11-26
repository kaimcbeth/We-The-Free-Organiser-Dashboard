-- Special event post types (Kai, 26 Nov 2026), applied by hand the same day.
-- Not added to private.create_special_promo_tasks yet: their days are still
-- to be set, so for now they're only made by hand.
insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, appear_hours, schedule, anchor, audience, core_role, default_enabled, sort_order) values
('special_bring','What to bring posted','A simple list of what to bring: a plate to share, water, a hat, sunscreen, something to sit on. Instagram story and WhatsApp.','What to bring',10,0,0,'special','start','community','promo_lead',true,2),
('special_why','Why you should come posted','The reasons to come, in a warm, personal voice: good people, good food, a relaxed way to see the year out. Make it feel like an invite from a friend. Instagram and Facebook.','Why you should come',15,0,0,'special','start','community','promo_lead',true,2),
('special_resolutions','New Year''s resolutions post','Ask people for their resolutions for the animals in 2027, using a question sticker or a comment prompt. Share the best answers. Instagram stories and WhatsApp.','New Year''s resolutions',10,0,0,'special','start','community','promo_lead',true,2),
('special_animal_friendly','Animal-friendly NYE posted','A gentle, hopeful post about seeing the year out in a way that''s kind to animals, with the event as the easy way to do it. Instagram and Facebook.','Animal-friendly NYE',15,0,0,'special','start','community','promo_lead',true,2),
('special_faq','FAQs posted','Answer the questions people have before coming: do I need to be vegan, can I come alone, can I bring kids or a dog, what to bring, how to get there. Instagram story run and WhatsApp.','FAQs',15,0,0,'special','start','community','promo_lead',true,2),
('special_playlist','Playlist post shared','Share the playlist for the day and ask people to add a song. Instagram story and WhatsApp.','Playlist',10,0,0,'special','start','community','promo_lead',true,2),
('special_location','Location posted','Where it is and exactly where to find the group, with the meeting point graphic, nearest train or bus, and parking. Instagram story and WhatsApp.','Location',10,0,0,'special','start','community','promo_lead',true,2),
('special_dishes','Easy dishes posted','A few easy vegan dishes people can bring if they''re stuck for ideas: quick, cheap and good in the heat. Instagram and WhatsApp.','Easy dishes',15,0,0,'special','start','community','promo_lead',true,2)
on conflict (kind) do nothing;

-- Sydney's New Years Eve Social as a special event, with all nine made now
-- (placeholder due date 30 Dec 6 pm until the days are set).
update events set special_event_id = '48d0aa6e-3e57-4b09-bee1-e2ccc8a67448'
where id = 'c6534ae0-6061-4b0c-9853-b5cdef65ffa6';
insert into tasks (team_id, event_id, kind, period, show_from, due_at, assigned_to)
select e.team_id, e.id, k, 'special:' || e.id || ':' || k, now(), '2026-12-30 18:00:00+11'::timestamptz,
       private.task_assignee(e.team_id, k, e.event_type_id, (now() at time zone 'Australia/Sydney')::date)
from events e
cross join unnest(array['special_bring','special_why','special_resolutions','special_animal_friendly','special_faq','special_playlist','special_location','special_throwback','special_dishes']) k
where e.id = 'c6534ae0-6061-4b0c-9853-b5cdef65ffa6'
on conflict (team_id, kind, period) where period is not null do nothing;
