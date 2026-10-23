-- (Applied as expiring_actions.) Some actions only make sense until a point
-- (photos on the day, promoting before the event). Past that, they quietly
-- disappear (dismissed by a 10-minute cron).
alter table public.task_kinds
  add column expire_anchor text check (expire_anchor in ('start', 'end')),
  add column expire_after_hours numeric;

update public.task_kinds set expire_anchor = 'start', expire_after_hours = 0
  where kind in ('facebook_event', 'promote_facebook_groups', 'promote_whatsapp', 'promote_instagram', 'prizes_purchased');
update public.task_kinds set expire_anchor = 'end', expire_after_hours = 2
  where kind = 'take_photos';
update public.task_kinds set expire_anchor = 'end', expire_after_hours = 36
  where kind = 'instagram_stories';

create or replace function private.expire_tasks() returns void
language sql security definer set search_path = public as $$
  update tasks t set dismissed_at = now()
  from task_kinds k, events e
  where k.kind = t.kind and e.id = t.event_id
    and t.done_at is null and t.dismissed_at is null
    and k.expire_after_hours is not null
    and now() > (case k.expire_anchor when 'end' then coalesce(e.ends_at, e.starts_at) else e.starts_at end)
               + make_interval(mins => (k.expire_after_hours * 60)::int);
$$;

select private.expire_tasks();
select cron.schedule('expire-actions', '*/10 * * * *', 'select private.expire_tasks()');
