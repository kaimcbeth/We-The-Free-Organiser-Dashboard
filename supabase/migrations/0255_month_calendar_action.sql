-- "Month calendar posted" at the end of each month (Kai, 26 Nov 2026:
-- "Setup monthly calendar generator and make it an action at end of the
-- month"). Same month_end timing as the monthly recap: appears 5 days before
-- the month ends, due (and tidied away) 5 days into the next. The card's
-- "Make the calendar" opens the month calendar for the month it's due in.
insert into task_kinds (kind, title, blurb, description, audience, schedule, core_role,
                        default_enabled, estimate_minutes, sort_order, tier, importance, anchor, due_after_hours)
values ('promo_month_calendar', 'Month calendar posted',
        'What''s on next month, on one graphic',
        'Post next month''s events as one "What''s on in …" graphic on Instagram and Facebook (and the community chat). Special events glow, every date gets its own row, and you can tick which ones to show (up to 8).',
        'community', 'month_end', 'promo_lead', true, 10, 34, 2,
        (select importance from task_kinds where kind = 'promo_monthly_recap'), 'end', 0)
on conflict (kind) do nothing;
