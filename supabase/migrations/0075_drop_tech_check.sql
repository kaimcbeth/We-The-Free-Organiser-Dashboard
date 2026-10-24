-- (Tech check was briefly archived, then kept: resources will be attached
-- to it later. Net effect: no change.)
update task_kinds set archived_at = null where kind = 'ev_tech_check';
