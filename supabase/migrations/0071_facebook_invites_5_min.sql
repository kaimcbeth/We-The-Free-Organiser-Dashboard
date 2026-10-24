-- Facebook event invites take about 5 minutes, not 5–10.
update public.task_kinds
set estimate_minutes = 5, estimate_max_minutes = null
where kind = 'facebook_invites';
