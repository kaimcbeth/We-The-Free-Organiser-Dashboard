-- Tech check happens on the day; it doesn't need to be in the Hub.
update task_kinds set archived_at = now() where kind = 'ev_tech_check';
update tasks set dismissed_at = now()
where kind = 'ev_tech_check' and done_at is null and dismissed_at is null;
update task_owners set ended_at = now() where kind = 'ev_tech_check' and ended_at is null;
