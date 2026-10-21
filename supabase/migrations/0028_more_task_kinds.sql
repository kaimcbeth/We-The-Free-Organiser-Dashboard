-- More tasks per event: photos to WhatsApp, Facebook and Instagram.
alter table task_kinds add column sort_order int not null default 0;

update task_kinds set title = 'Photos posted to WhatsApp', sort_order = 1,
  description = 'The best photos from the event are up in the WhatsApp community. Tick it off once they''re posted, whoever posted them.'
where kind = 'post_photos';

insert into task_kinds (kind, title, description, estimate_minutes, due_after_hours, sort_order) values
  ('post_photos_facebook', 'Photos posted to Facebook',
   'A few photos from the event are up on the community''s Facebook page or group. Tick it off once they''re posted, whoever posted them.', 5, 48, 2),
  ('post_photos_instagram', 'Photos posted to Instagram',
   'A few photos from the event are up on the community''s Instagram. Tick it off once they''re posted, whoever posted them.', 5, 48, 3);

-- Every kind of task is made for each event that has just finished.
create or replace function private.create_event_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  insert into tasks (team_id, event_id, kind, due_at)
  select e.team_id, e.id, k.kind,
         coalesce(e.ends_at, e.starts_at + interval '3 hours') + make_interval(hours => k.due_after_hours)
  from events e
  cross join task_kinds k
  where coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now()
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '7 days'
  on conflict (event_id, kind) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select private.create_event_tasks();
