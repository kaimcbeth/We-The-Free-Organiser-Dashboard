-- Mental health resources (Kai, 5 Nov 2026): every 3 months, share
-- https://activism.wtf/mental-health in the community WhatsApp chat.
-- Quarterly like the incident report form reminder (private.create_monthly_tasks
-- makes one per quarter, due 30 days into it or a week after it appears).
insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, sort_order,
                        anchor, appear_hours, audience, schedule, schedule_day, core_role, default_enabled, late_ok)
values ('com_mental_health', 'Mental health resources shared',
        'A gentle reminder in the community WhatsApp chat about We The Free''s mental health resources for activists (support line, free burnout course, support groups, meditation apps): https://activism.wtf/mental-health',
        'Share the mental health resources in the WhatsApp chat',
        5, 168, 54, 'end', 0, 'community', 'quarterly', 1, 'community_lead', true, false)
on conflict (kind) do nothing;
