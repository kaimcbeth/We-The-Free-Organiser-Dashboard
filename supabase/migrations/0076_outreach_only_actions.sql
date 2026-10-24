-- (Applied as outreach_only_actions.) Some actions only make sense at
-- outreach events (tech check, volunteer briefing), not socials.
alter table task_kinds add column outreach_only boolean not null default false;
update task_kinds set outreach_only = true where kind in ('ev_tech_check', 'ev_briefing');

do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_event_tasks()'::regprocedure);
  d := replace(d,
    'and (k.event_type_id is null or k.event_type_id = e.event_type_id)',
    'and (k.event_type_id is null or k.event_type_id = e.event_type_id)
                     and (not k.outreach_only or exists (select 1 from event_types et where et.id = e.event_type_id and et.counts_as_outreach))');
  if d not like '%outreach_only%' then raise exception 'pattern not found'; end if;
  execute d;
end $$;

update tasks t set dismissed_at = now()
from task_kinds k, events e
where t.kind = k.kind and k.outreach_only and t.event_id = e.id
  and t.done_at is null and t.dismissed_at is null
  and not exists (select 1 from event_types et where et.id = e.event_type_id and et.counts_as_outreach);
