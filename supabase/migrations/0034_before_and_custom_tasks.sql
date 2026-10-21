-- Before-event tasks (promotion), and organisers' own custom tasks.
-- (Applied as before_and_custom_tasks: task_kinds gains anchor/appear_hours/
-- team_id/archived_at/created_by; three promotion kinds; create_event_tasks
-- handles before (anchored to start) and after (anchored to end) tasks;
-- add_custom_task / remove_custom_task RPCs; task_kinds read policy limited
-- to shared kinds plus the community's own.)
alter table task_kinds
  add column anchor text not null default 'end' check (anchor in ('start', 'end')),
  add column appear_hours int not null default 0,
  add column team_id uuid references teams (id) on delete cascade,
  add column archived_at timestamptz,
  add column created_by uuid references auth.users (id) on delete set null;

insert into task_kinds (kind, title, description, estimate_minutes, anchor, appear_hours, due_after_hours, sort_order) values
  ('promote_facebook_groups', 'Promoted in local Facebook groups',
   'The event is shared in local vegan and community Facebook groups.', 10, 'start', -168, -72, 1),
  ('promote_whatsapp', 'Promoted in WhatsApp community',
   'The event is posted in the WhatsApp community so members know it''s on.', 5, 'start', -168, -72, 2),
  ('promote_instagram', 'Promoted on community Instagram',
   'The event is on the community''s Instagram (post or story).', 10, 'start', -168, -72, 3);

-- (Follow-ups applied as set_team_tasks_scoped and before_tasks_not_late:
-- set_team_tasks only touches shared + own kinds; before-event tasks are
-- only made while there's still time before they're due.)
