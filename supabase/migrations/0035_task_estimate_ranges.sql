-- Time estimates can be a range ("5–10 min").
alter table task_kinds add column estimate_max_minutes int;
update task_kinds set estimate_minutes = 5, estimate_max_minutes = 10
where kind in ('promote_facebook_groups', 'promote_instagram');
