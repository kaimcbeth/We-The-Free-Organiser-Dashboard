-- Kai, 26 Nov 2026: "Remove this outright" ("Thank-you messages sent").
update task_kinds set archived_at = now() where kind = 'com_thank_you' and archived_at is null;
update tasks set dismissed_at = now()
where kind = 'com_thank_you' and done_at is null and dismissed_at is null;
