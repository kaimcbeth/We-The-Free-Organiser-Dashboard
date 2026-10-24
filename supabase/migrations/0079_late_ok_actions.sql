-- (Applied as late_ok_actions.) Some actions are still worth doing after
-- their due date, up until the event starts (police approval). Those are
-- still made late; others (e.g. promo) aren't once their due date has gone.
alter table task_kinds add column late_ok boolean not null default false;
update task_kinds set late_ok = true where kind = 'approval_submitted';

do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_event_tasks()'::regprocedure);
  d := replace(d, 'k.anchor, k.appear_hours, k.due_after_hours', 'k.anchor, k.appear_hours, k.due_after_hours, k.late_ok');
  d := replace(d,
    'case when c.anchor = ''start'' then c.anchor_at + make_interval(hours => c.due_after_hours) > now()',
    'case when c.anchor = ''start'' then (c.anchor_at + make_interval(hours => c.due_after_hours) > now() or (c.late_ok and c.anchor_at > now()))');
  if d not like '%c.late_ok and%' or d not like '%k.late_ok%' then raise exception 'pattern not found'; end if;
  execute d;
end $$;
