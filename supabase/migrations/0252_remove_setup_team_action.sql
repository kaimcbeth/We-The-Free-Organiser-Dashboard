-- Kai, 25 Nov 2026: "Remove this action altogether from the hub" (Set-up team organised).
update task_kinds set archived_at = now() where kind = 'ev_setup_team' and archived_at is null;
update tasks set dismissed_at = now()
where kind = 'ev_setup_team' and done_at is null and dismissed_at is null;
