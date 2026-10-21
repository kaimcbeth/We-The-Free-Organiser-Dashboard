-- "Attendance taken": shows 3 hours before each event, due 6 hours after it
-- starts, and ticks itself off once anyone is marked as here.
insert into task_kinds (kind, title, description, estimate_minutes, anchor, appear_hours, due_after_hours, sort_order) values
  ('take_attendance', 'Attendance taken',
   'Everyone who came is ticked in. This ticks itself off once attendance has started.', 10, 'start', -3, 6, 6);

create or replace function private.attendance_done_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update tasks set done_at = now(), done_by = auth.uid()
  where event_id = new.event_id and kind = 'take_attendance' and done_at is null;
  return new;
end;
$$;
create trigger attendance_ticks_task after insert on attendance
  for each row execute function private.attendance_done_task();
