-- (Applied as task_assigned_by.) Remember who delegated an action
-- (tasks.assigned_by, set by assign_task) so the person it was handed to sees
-- "Delegated to you by Kai" with their photo. my_task_delegators(task ids)
-- returns the delegator's name and member profile for the caller's own
-- actions (or a community they organise).
alter table public.tasks add column assigned_by uuid;
-- assign_task: update tasks set assigned_to = p_person_id,
--   assigned_by = case when p_person_id is null then null else auth.uid() end
-- (full body in the database)
