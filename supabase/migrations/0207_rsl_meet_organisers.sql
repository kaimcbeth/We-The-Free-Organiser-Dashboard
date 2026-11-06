-- Kai, 6 Nov 2026: "Do a monthly meet the organisers post". Built-in
-- region-wide monthly RSL action; the card has "The questions" (to send to the
-- organiser) and "Make the post" (the Meet the Members maker in organiser mode).
insert into task_kinds (kind, title, blurb, description, estimate_minutes, estimate_max_minutes,
                        anchor, appear_hours, due_after_hours, sort_order, audience, schedule, default_enabled)
values ('rsl_meet_organisers', 'Meet the Organisers posted',
        'A monthly post featuring one of your organisers',
        'Pick an organiser from one of your communities (someone new, or someone who''s had a big month), send them the questions and ask for a few photos, then make the carousel and post it.',
        20, 40, 'start', 0, 0, 43, 'regional', 'region_monthly', true)
on conflict (kind) do nothing;

select private.create_region_tasks();
