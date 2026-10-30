-- Meet the Members: once a month (1st Monday by default, changeable), ask a
-- volunteer to answer the Meet the Members questions; ticking that off brings
-- up "Meet the Members posted" (share their answers on social media), due a
-- week later. Each community can change the questions (teams.meet_members_questions;
-- null = the default set in src/lib/meet-members.ts).

alter table public.teams add column if not exists meet_members_questions text
  check (char_length(meet_members_questions) <= 4000);

insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, schedule,
                        schedule_week, schedule_weekday, sort_order, audience, default_enabled, core_role)
values
  ('meet_members_ask', 'Meet the Members: volunteer asked',
   'Pick a volunteer to feature this month and send them the Meet the Members questions.',
   'Ask a volunteer to answer the questions', 5, 0, 'monthly', 1, 1, 40, 'community', true, 'community_lead'),
  ('meet_members_post', 'Meet the Members posted',
   'Share their answers (and a photo, if they''re happy to) on your community''s social media.',
   'Post their answers', 10, 0, 'follow_up', null, null, 41, 'community', true, 'promo_lead')
on conflict (kind) do update set title = excluded.title, description = excluded.description, blurb = excluded.blurb;

-- Ticking off "volunteer asked" brings up "posted" (due a week later).
create or replace function private.meet_members_follow_up()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'meet_members_ask' and new.done_at is not null and old.done_at is null then
    insert into tasks (team_id, kind, period, due_at, assigned_to)
    values (new.team_id, 'meet_members_post', coalesce(new.period, to_char(now(), 'YYYY-MM')) || '-post',
            now() + interval '7 days',
            private.task_assignee(new.team_id, 'meet_members_post', null, current_date))
    on conflict (team_id, kind, period) where period is not null do nothing;
  end if;
  return new;
end $$;
create or replace trigger tasks_meet_members_follow_up after update of done_at on public.tasks
  for each row execute function private.meet_members_follow_up();

create or replace function public.set_meet_members_questions(p_team_id uuid, p_questions text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then return 'not allowed'; end if;
  update teams set meet_members_questions = nullif(left(trim(coalesce(p_questions, '')), 4000), '')
  where id = p_team_id;
  return 'ok';
end $$;
revoke execute on function public.set_meet_members_questions(uuid, text) from public, anon;
grant execute on function public.set_meet_members_questions(uuid, text) to authenticated;
