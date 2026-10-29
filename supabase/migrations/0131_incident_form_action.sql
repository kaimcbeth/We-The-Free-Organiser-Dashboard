-- Every 3 months: remind the community that the incident report form exists.
-- (The "Write message" button uses write-copy with { purpose: "incident" }.)
insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, schedule, schedule_day,
                        audience, default_enabled, sort_order)
values ('com_incident_form', 'Incident report form shared',
        'A heads-up in the community chat about the incident report form, so everyone knows where to report anything that goes wrong at an event.',
        'Remind everyone where to report problems', 5, 168, 'quarterly', 1, 'community', true, 53)
on conflict (kind) do nothing;
