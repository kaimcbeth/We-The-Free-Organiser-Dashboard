-- Kai, 6 Nov 2026: "Add a main page repost every week for the regional
-- social media pages". Built-in region-wide weekly RSL action; shown in the
-- RSL view's Social media section (src/lib/rsl-social.ts).

insert into task_kinds (kind, title, blurb, description, estimate_minutes, estimate_max_minutes,
                        anchor, appear_hours, due_after_hours, sort_order, audience, schedule, default_enabled)
values ('rsl_main_repost', 'Main page post reposted on the regional socials',
        'This week''s best post from the main We The Free page, shared on the regional pages',
        'Pick the best post from the main We The Free page this week and share it on the regional pages: a story share on Instagram, a share on Facebook. Add a line saying what it means locally, or which communities have an event coming up.',
        5, 10, 'start', 0, 0, 39, 'regional', 'region_weekly', true)
on conflict (kind) do nothing;

select private.create_region_tasks();
