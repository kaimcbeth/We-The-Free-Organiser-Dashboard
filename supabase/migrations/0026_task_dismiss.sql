-- Organisers can remove a task with the × (kept as "dismissed" so the
-- hourly job doesn't make it again).
alter table tasks add column dismissed_at timestamptz;
create index tasks_team_active_idx on tasks (team_id, due_at) where done_at is null and dismissed_at is null;
