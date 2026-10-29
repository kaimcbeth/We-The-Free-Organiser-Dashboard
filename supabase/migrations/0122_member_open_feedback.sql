-- (Applied as member_open_feedback.) Open feedback from a volunteer's own
-- page: a message to their organisers, with their name or anonymously (then
-- nothing links it to them). Lands with the rest of the community's volunteer
-- feedback.
alter table public.volunteer_feedback add column message text check (char_length(message) <= 2000);

create function public.send_my_feedback(p_message text, p_anonymous boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_name text;
begin
  if p_message is null or char_length(trim(p_message)) < 2 then return 'empty'; end if;
  select p.team_id, trim(p.first_name || ' ' || coalesce(p.last_name, ''))
    into v_team, v_name
  from people p where p.user_id = auth.uid() limit 1;
  if v_team is null then return 'not_allowed'; end if;
  insert into volunteer_feedback (team_id, message, name)
  values (v_team, left(trim(p_message), 2000), case when p_anonymous then null else v_name end);
  return 'ok';
end $$;
revoke execute on function public.send_my_feedback(text, boolean) from public, anon;
grant execute on function public.send_my_feedback(text, boolean) to authenticated;
