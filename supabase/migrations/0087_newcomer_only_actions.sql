-- (Applied as newcomer_only_actions.)
-- Photo consent: per newcomer (made at their first check-in), not per event.
update task_kinds set schedule = 'newcomer', anchor = 'end', appear_hours = 0, due_after_hours = 24,
  expire_anchor = null, expire_after_hours = null,
  blurb = 'Ask a newcomer if they''re happy to be in photos',
  description = 'This newcomer has been asked if they''re happy to be in photos. If not, leave them out of anything posted.'
where kind = 'promo_photo_consent';
update tasks set dismissed_at = now()
where kind = 'promo_photo_consent' and person_id is null and done_at is null and dismissed_at is null;

-- New volunteers reminded: only for events when the community has newcomers.
alter table task_kinds add column needs_team_newcomers boolean not null default false;
update task_kinds set needs_team_newcomers = true,
  description = 'Your newcomers have had a friendly reminder that this event is on, with when and where.'
where kind = 'com_remind_new';

create or replace function private.team_has_newcomers(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from people p
    join attendance a on a.person_id = p.id
    join events e on e.id = a.event_id
    where p.team_id = p_team_id and not p.is_test and not p.attended_before_app
      and e.starts_at <= now()
    group by p.id
    having count(*) between 1 and 4 and min(e.starts_at) > now() - interval '90 days');
$$;

do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_event_tasks()'::regprocedure);
  d := replace(d,
    'and (not k.needs_newcomers or',
    'and (not k.needs_team_newcomers or private.team_has_newcomers(e.team_id))
                     and (not k.needs_newcomers or');
  if d not like '%needs_team_newcomers%' then raise exception 'pattern not found'; end if;
  execute d;
end $$;

update tasks t set dismissed_at = now()
where t.kind = 'com_remind_new' and t.done_at is null and t.dismissed_at is null
  and not private.team_has_newcomers(t.team_id);
