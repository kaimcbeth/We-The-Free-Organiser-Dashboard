-- (Applied by hand.) The tour's "Police approval in two taps" card points at a
-- real Police approval action on the Example Community's outreach event.
insert into tasks (team_id, event_id, kind, due_at)
select e.team_id, e.id, 'approval_submitted', e.starts_at - interval '192 hours'
from events e join teams t on t.id = e.team_id
where t.is_example and e.title = 'Outreach' and e.starts_at > now()
on conflict do nothing;
