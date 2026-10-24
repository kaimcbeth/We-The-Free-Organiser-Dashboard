-- (Applied as core_role_actions.) The full Core Team role lists as actions.
-- New actions start switched off (task_kinds.default_enabled = false): they
-- sit in "Also available" until an organiser switches them on, or a Core Team
-- member takes one on (then it's made for them). Switched on with nobody
-- looking after it, it goes to the organisers, like every action.
-- Adds a 'quarterly' schedule. As-needed duties live in src/lib/roles.ts.

alter table task_kinds add column default_enabled boolean not null default true;
alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check
  check (schedule in ('event', 'weekly', 'monthly', 'quarterly'));

do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_event_tasks()'::regprocedure);
  d := replace(d, 'coalesce(s.enabled, true)', 'coalesce(s.enabled, k.default_enabled)');
  execute d;
  d := pg_get_functiondef('private.create_monthly_tasks()'::regprocedure);
  d := replace(d, 'coalesce(s.enabled, true)', 'coalesce(s.enabled, k.default_enabled)');
  d := replace(d, '  ), made as (', $q$    union all
    select t.id, k.kind, to_char(t.today, 'YYYY-"Q"Q'),
           greatest(((date_trunc('quarter', t.today)::date + 30)::timestamp
             + interval '23 hours 59 minutes') at time zone t.tz, now() + interval '7 days'),
           private.task_assignee(t.id, k.kind, null, t.today)
    from t join task_kinds k on k.schedule = 'quarterly' and k.audience = 'community' and k.archived_at is null
                             and (k.team_id is null or k.team_id = t.id)
    left join team_task_kinds s on s.team_id = t.id and s.kind = k.kind
    where (coalesce(s.enabled, k.default_enabled) or private.has_owner(t.id, k.kind))
  ), made as ($q$);
  execute d;
end $$;

-- Sharing photos to WhatsApp sits with the Promo Lead in the role lists.
update task_kinds set core_role = 'promo_lead' where kind = 'post_photos';

insert into task_kinds (kind, title, blurb, description, core_role, schedule, schedule_weekday, schedule_day,
                        anchor, appear_hours, due_after_hours, estimate_minutes, estimate_max_minutes,
                        expire_anchor, expire_after_hours, sort_order, default_enabled)
values
-- Events Lead
('ev_setup_team', 'Set-up team organised', 'Who''s helping set up on the day',
 'You know who''s helping set up and pack down, and they know when to arrive.',
 'events_lead', 'event', null, null, 'start', -168, -24, 5, null, 'start', 0, 21, false),
('ev_weather', 'Weather checked', 'Check the forecast, flag a backup plan',
 'The forecast is checked. If it looks bad, the backup plan (or a change) is shared with the team.',
 'events_lead', 'event', null, null, 'start', -48, -24, 5, 10, 'start', 0, 22, false),
('ev_tech_check', 'Tech check done', 'Screens, headphones and chargers ready',
 'The screens, headphones and chargers all work and are charged before the event.',
 'events_lead', 'event', null, null, 'start', -24, 0, 5, null, 'start', 1, 23, false),
('ev_setup', 'Equipment set up', 'Bring the gear, lay out the challenge space',
 'The gear is at the spot and the challenge space is laid out, ready for people to arrive.',
 'events_lead', 'event', null, null, 'start', -6, 1, 10, null, 'start', 3, 24, false),
('ev_briefing', 'Volunteers briefed', 'A quick run-through before you start',
 'Everyone helping knows the plan, their spot and who to ask if something comes up.',
 'events_lead', 'event', null, null, 'start', -6, 1, 5, null, 'start', 3, 25, false),
('ev_packdown', 'Pack-down and gear check', 'Everything packed and accounted for',
 'Everything is packed up, nothing''s left behind, and anything broken or missing is flagged.',
 'events_lead', 'event', null, null, 'end', 0, 12, 10, 15, 'end', 24, 26, false),
('ev_debrief', 'Volunteers debriefed', 'What went well, what to change',
 'A quick chat with the volunteers: how it went, what to keep and what to change next time.',
 'events_lead', 'event', null, null, 'end', 0, 24, 5, 10, null, null, 27, false),
('ev_reimbursement', 'Prize reimbursement claimed', 'Claim back what you spent on prizes',
 'Receipts for this month''s prizes are submitted so whoever paid gets reimbursed.',
 'events_lead', 'monthly', null, 1, 'end', 0, 0, 5, null, null, null, 28, false),
-- Promo Lead
('promo_photo_consent', 'Photo consent checked', 'Ask new volunteers if photos are OK',
 'New volunteers have been asked if they''re happy to be in photos, and anyone who isn''t is left out.',
 'promo_lead', 'event', null, null, 'start', -2, 3, 5, null, 'start', 6, 31, false),
('promo_answer_questions', 'Questions answered on event posts', 'Reply to comments and messages',
 'Questions on this week''s event posts and listings have been answered.',
 'promo_lead', 'weekly', 1, null, 'end', 0, 0, 5, null, null, null, 32, false),
('promo_monthly_recap', 'Monthly recap posted', 'One post with all last month''s events',
 'A recap of last month''s events (photos and highlights) is posted on Facebook and Instagram.',
 'promo_lead', 'monthly', null, 1, 'end', 0, 0, 20, null, null, null, 33, false),
-- Community Lead
('com_remind_new', 'New volunteers reminded', 'Message newcomers that it''s on',
 'New volunteers have had a friendly reminder that the event is on, with when and where.',
 'community_lead', 'event', null, null, 'start', -72, -24, 5, null, 'start', 0, 41, false),
('com_welcome', 'New volunteers welcomed', 'Say hi at the event and in the chat',
 'Anyone new got a proper welcome, in person and in the chat.',
 'community_lead', 'event', null, null, 'start', 0, 24, 2, null, null, null, 42, false),
('com_thank_you', 'Thank-you messages sent', 'Thank everyone who came',
 'Everyone who came has had a thank-you message.',
 'community_lead', 'event', null, null, 'end', 0, 24, 5, null, null, null, 43, false),
('com_checkins', 'Checked in with everyone who came', 'How did they find it?',
 'You''ve checked in with the people who came: how they found it, and whether they''ll come again.',
 'community_lead', 'event', null, null, 'end', 0, 48, 10, null, null, null, 44, false),
('com_whatsapp_requests', 'WhatsApp join requests approved', 'Let new people into the community',
 'Everyone waiting to join the WhatsApp community has been let in.',
 'community_lead', 'weekly', 1, null, 'end', 0, 0, 1, null, null, null, 45, false),
('com_onboarding', 'Onboarding sent to new volunteers', 'Send newcomers the welcome info',
 'This week''s new volunteers have the onboarding materials.',
 'community_lead', 'weekly', 1, null, 'end', 0, 0, 2, null, null, null, 46, false),
('com_buddies', 'Buddies organised', 'Pair newcomers with a regular',
 'Each newcomer has a regular looking out for them (New member support on their profile), and buddies have messaged before the next event.',
 'community_lead', 'weekly', 1, null, 'end', 0, 0, 5, 10, null, null, 47, false),
('com_moderation', 'Chat moderation checked', 'Keep the chats friendly',
 'The community chats have been checked and anything that needed dealing with was dealt with.',
 'community_lead', 'weekly', 1, null, 'end', 0, 0, 5, null, null, null, 48, false),
('com_regulars', 'Regulars list checked', 'Make sure the regulars look right',
 'The People page keeps track of regulars from attendance. Check it looks right and nobody''s missing.',
 'community_lead', 'monthly', null, 1, 'end', 0, 0, 5, null, null, null, 49, false),
('com_reengage', 'Quiet volunteers re-engaged', 'Message people not seen in a while',
 'People tagged "Not seen in a while" on the People page have had a friendly message.',
 'community_lead', 'monthly', null, 1, 'end', 0, 0, 15, null, null, null, 50, false),
('com_community_event', 'Community social planned', 'A social or post-event get-together',
 'A community event (a social, dinner or post-event hangout) is planned and listed.',
 'community_lead', 'quarterly', null, 1, 'end', 0, 0, 30, null, null, null, 51, false),
('com_feedback', 'Volunteer feedback collected', 'Ask how things are going',
 'Volunteers have been asked how things are going and what would make it better.',
 'community_lead', 'quarterly', null, 1, 'end', 0, 0, 20, null, null, null, 52, false);
