-- (Applied as welcome_only_with_newcomers.)
-- "Checked in with everyone who came": removed.
update task_kinds set archived_at = now() where kind = 'com_checkins';
update tasks set dismissed_at = now() where kind = 'com_checkins' and done_at is null and dismissed_at is null;
update task_owners set ended_at = now() where kind = 'com_checkins' and ended_at is null;

-- "New volunteers welcomed": only made when someone new checks in.
alter table task_kinds add column needs_newcomers boolean not null default false;
update task_kinds set needs_newcomers = true where kind = 'com_welcome';

do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_event_tasks()'::regprocedure);
  d := replace(d,
    'and (not k.outreach_only or',
    'and (not k.needs_newcomers or exists (
                       select 1 from attendance a join people p on p.id = a.person_id
                       where a.event_id = e.id and not p.attended_before_app
                         and not exists (select 1 from attendance a2 join events e2 on e2.id = a2.event_id
                                         where a2.person_id = a.person_id and e2.starts_at < e.starts_at)))
                     and (not k.outreach_only or');
  if d not like '%needs_newcomers%' then raise exception 'pattern not found'; end if;
  execute d;
end $$;

update tasks t set dismissed_at = now()
from events e
where t.kind = 'com_welcome' and t.event_id = e.id and t.done_at is null and t.dismissed_at is null
  and not exists (
    select 1 from attendance a join people p on p.id = a.person_id
    where a.event_id = e.id and not p.attended_before_app
      and not exists (select 1 from attendance a2 join events e2 on e2.id = a2.event_id
                      where a2.person_id = a.person_id and e2.starts_at < e.starts_at));
