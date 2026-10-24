-- "Chat moderation checked": removed.
update task_kinds set archived_at = now() where kind = 'com_moderation';
update tasks set dismissed_at = now() where kind = 'com_moderation' and done_at is null and dismissed_at is null;
update task_owners set ended_at = now() where kind = 'com_moderation' and ended_at is null;
