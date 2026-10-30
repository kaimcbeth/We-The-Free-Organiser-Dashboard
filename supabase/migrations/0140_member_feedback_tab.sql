-- Members' Feedback tab: messages up to 20,000 characters, and each one goes
-- straight to the community's organisers as a notification (opens the
-- Feedback page, /feedback-inbox).
alter table public.volunteer_feedback drop constraint if exists volunteer_feedback_message_check;
alter table public.volunteer_feedback add constraint volunteer_feedback_message_check check (char_length(message) <= 20000);

create or replace function public.send_my_feedback(p_message text, p_anonymous boolean)
 returns text language plpgsql security definer set search_path to 'public' as $function$
declare v_team uuid; v_name text; v_msg text := left(trim(coalesce(p_message, '')), 20000);
begin
  if char_length(v_msg) < 2 then return 'empty'; end if;
  select p.team_id, trim(p.first_name || ' ' || coalesce(p.last_name, ''))
    into v_team, v_name
  from people p where p.user_id = auth.uid() limit 1;
  if v_team is null then return 'not_allowed'; end if;
  insert into volunteer_feedback (team_id, message, name)
  values (v_team, v_msg, case when p_anonymous then null else v_name end);
  insert into notifications (user_id, kind, title, body, url)
  select o.id, 'feedback',
         case when p_anonymous then 'Anonymous feedback' else 'Feedback from ' || v_name end,
         left(v_msg, 300) || case when char_length(v_msg) > 300 then '…' else '' end,
         '/feedback-inbox'
  from organisers o
  where (o.access = 'organiser' and o.team_id = v_team)
     or (o.access = 'god' and o.organiser_team_id = v_team);
  return 'ok';
end $function$;
