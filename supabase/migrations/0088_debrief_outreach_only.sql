-- Volunteers debriefed: outreach events only.
update task_kinds set outreach_only = true where kind = 'ev_debrief';
update tasks t set dismissed_at = now() from events e
where t.event_id = e.id and t.kind = 'ev_debrief' and t.done_at is null and t.dismissed_at is null
  and not exists (select 1 from event_types et where et.id = e.event_type_id and et.counts_as_outreach);

-- Pack-down and gear check: outreach events only too.
update task_kinds set outreach_only = true where kind = 'ev_packdown';
update tasks t set dismissed_at = now() from events e
where t.event_id = e.id and t.kind = 'ev_packdown' and t.done_at is null and t.dismissed_at is null
  and not exists (select 1 from event_types et where et.id = e.event_type_id and et.counts_as_outreach);
