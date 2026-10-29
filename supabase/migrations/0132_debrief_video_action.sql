-- After each outreach event: post the debrief video.
insert into task_kinds (kind, title, description, blurb, estimate_minutes, estimate_max_minutes, anchor, appear_hours,
                        due_after_hours, schedule, audience, outreach_only, default_enabled, core_role, sort_order)
values ('post_debrief_video', 'Debrief video posted',
        'The debrief video from the outreach is posted, so volunteers (and anyone who couldn''t make it) can see how it went.',
        'Share the debrief video', 10, 15, 'end', 0, 48, 'event', 'community', true, true, 'promo_lead', 10)
on conflict (kind) do nothing;
