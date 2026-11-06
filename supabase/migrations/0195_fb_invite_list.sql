-- Monthly action (Kai, 6 Nov 2026): "a recurring task at the start of every
-- month to update the Facebook custom invite list". Appears on the 1st, due
-- the 8th (monthly schedule, schedule_day 1). On by default, since the
-- Facebook event set up action's "Invites sent" box uses that list.

insert into task_kinds (kind, title, description, blurb, estimate_minutes, estimate_max_minutes, due_after_hours,
                        sort_order, anchor, appear_hours, audience, schedule, schedule_day, core_role, default_enabled, late_ok)
values
  ('fb_invite_list', 'Facebook invite list updated',
   'The custom friend list you invite to Facebook events is up to date: add everyone who came along or joined last month, and take off anyone who asked not to be invited.',
   'Add last month''s newcomers to the Facebook invite list', 5, 10, 0, 4, 'end', 0, 'community', 'monthly', 1,
   'promo_lead', true, true)
on conflict (kind) do nothing;
